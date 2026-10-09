import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  generates: {
    './src/types.generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        federation: true,
        useTypeImports: true,
        contextType: './context.js#Context',
        mappers: {
          User: './db/schema.js#UserRow',
        },
      },
    },
  },
};

export default config;
