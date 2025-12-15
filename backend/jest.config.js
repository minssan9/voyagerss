module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/modules/investand/legacy_src/$1',
    '^@prisma/client-workschd$': '<rootDir>/node_modules/@prisma/client-workschd',
    '^@prisma/client-investand$': '<rootDir>/node_modules/@prisma/client-investand',
    '^@prisma/client-aviation$': '<rootDir>/node_modules/@prisma/client-aviation',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
};
