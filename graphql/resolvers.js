module.exports = {
  Query: {
    getExtract: async ({ id }, { db }) => {
      const userId = Number(id);

      const user = await db.collection('users').findOne({ id: userId },
        { projection: { balance: 1, limit: 1, last_transactions: 1 } }

      );
      if (!user) {
        const error = new Error("Client not found");
        error.code = 404;
        throw error;
      }

      return {
        saldo: {
          total: user.balance,
          data_extrato: new Date().toISOString(),
          limite: user.limit,
        },
        ultimas_transacoes: user.last_transactions,
      };
    }
  },
  Mutation: {
    createTransaction: async ({ id, tipo, valor, descricao }, { db }) => {
      const userId = Number(id);

      const user = await db.collection('users').findOne(
        { id: userId },
        { projection: { balance: 1, limit: 1, last_transactions: 1 } }
      );

      if (!user) {
        const error = new Error("Client not found");
        error.code = 404;
        throw error;
      }
      validateTransactionData(tipo, valor, descricao, user);

      const transaction = {
        valor: valor,
        tipo: tipo,
        descricao: descricao,
        realizada_em: new Date().toISOString(),
      };

      const updatePipeline = [
        {
          $set: {
            last_transactions: {
              $slice: [
                {
                  $concatArrays: [[transaction], "$last_transactions"],
                },
                10,
              ],
            },
          },
        },
      ];

      if (tipo === 'd') {
        updatePipeline.unshift({
          $set: {
            balance: {
              $cond: [
                {
                  $gte: [
                    { $subtract: ["$balance", valor] },
                    { $subtract: [0, "$limit"] },
                  ],
                },
                { $subtract: ["$balance", valor] },
                "$balance",
              ],
            },
          },
        });
      } else {
        updatePipeline.unshift({
          $set: { balance: { $add: ["$balance", valor] } },
        });
      }

      const updateResult = await db.collection('users').findOneAndUpdate(
        { id: userId },
        updatePipeline,
        { returnDocument: "after", projection: { balance: 1, limit: 1 } }
      );


      return {
        limite: user.limit,
        saldo: updateResult.balance,
      };

    },
  },
};

function validateTransactionData(tipo, valor, descricao, user) {
  if (!["d", "c"].includes(tipo)) {
    const error = new Error("Invalid transaction type");
    error.code = 422;
    throw error;
  }
  if (!Number.isInteger(valor) || valor <= 0) {
    const error = new Error("Invalid transaction value");
    error.code = 422;
    throw error;
  }
  if (!descricao || (descricao.length > 10 || descricao.length < 1)) {
    const error = new Error("Invalid transaction description");
    error.code = 422;
    throw error;
  }
  if (tipo === 'd' && user.balance - valor < -user.limit) {
    const error = new Error("Insufficient funds");
    error.code = 422;
    throw error;
  }
}
