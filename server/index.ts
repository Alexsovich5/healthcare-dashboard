/**
 * Healthcare Dashboard - GraphQL Server
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { typeDefs, resolvers } from '../src/graphql/schema';

const app = express();
app.use(express.json());

const server = new ApolloServer({ typeDefs, resolvers });

async function start() {
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  app.get('/health', (_, res) => {
    res.json({ status: 'healthy', service: 'healthcare-dashboard' });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Dashboard server running on port ${PORT}`);
  });
}

start();
