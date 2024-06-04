const { gql } = require('apollo-server');

module.exports = gql`
  type Transaction {
    value: Int!
    type: String!
    description: String!
    realized_in: String!
  }

  type Balance {
    total: Int!
    extract_date: String!
    limit: Int!
  }

  type Extract {
    balance: Balance!
    last_transactions: [Transaction!]!
  }

  type Query {
    getExtract(id: ID!): Extract
  }

  type UserInfo {
    limit: Int!
    balance: Int!
  }

  type Mutation {
    createTransaction(id: ID!, type: String!, value: Int!, description: String!): UserInfo
  }
`;
