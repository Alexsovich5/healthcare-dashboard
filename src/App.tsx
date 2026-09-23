/**
 * Healthcare Operations Dashboard
 */

import React from 'react';
import { ApolloProvider, ApolloClient, InMemoryCache } from '@apollo/client';
import Dashboard from './components/Dashboard';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
});

const App: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <div className="app">
        <header className="app-header">
          <h1>Healthcare IT Operations</h1>
          <span className="org-name">Example Org</span>
        </header>
        <main>
          <Dashboard />
        </main>
      </div>
    </ApolloProvider>
  );
};

export default App;
