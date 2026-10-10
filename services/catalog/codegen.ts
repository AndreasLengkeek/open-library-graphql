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
          Book: './mappers.js#BookModel',
          Author: './mappers.js#AuthorModel',
        },
      },
    },
  },
};

export default config;
