const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const { MongoClient } = require('mongodb');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const uri = "mongodb://mongo:pass@mongo:27017/rbe?authSource=admin";

let db;

async function connectToMongoDB() {
  const client = new MongoClient(uri, {
    maxPoolSize: 30,
  });
  await client.connect();
  db = client.db('rbe');
  console.log('Connected to MongoDB');
  return client;
}

async function startServer() {
  await connectToMongoDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ db }),
  });
  
  await server.start();
  const app = express();
  server.applyMiddleware({ app });

  app.use(express.json());

  app.get('/clientes/:id/extrato', async (req, res) => {
    const { id } = req.params;
    try {
      const extract = await resolvers.Query.getExtract({ id }, { db });
      res.status(200).json(extract);
    } catch (error) {
      res.status(error.code || 500).json({ error: error.message });
    }
  });

  app.post('/clientes/:id/transacoes', async (req, res) => {
    const { id } = req.params;
    const { tipo, valor, descricao } = req.body;

    try {
      const user_info = await resolvers.Mutation.createTransaction({ id, tipo, valor, descricao }, { db });
      res.status(200).json(user_info);
    } catch (error) {
      res.status(error.code || 500).json({ error: error.message });
    }
  });

  const PORT = 80;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
  });

}

startServer().catch(error => {
  console.error('Failed to start server:', error);
});


