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
        enumsAsTypes: true,
        mappers: {
          Review: './mappers.js#ReviewModel',
          CustomShelf: './mappers.js#CustomShelfModel',
          StatusShelf: './mappers.js#StatusShelfModel',
          Book: './mappers.js#BookRef',
          User: './mappers.js#UserRef',
        },
      },
    },
  },
};

export default config;
