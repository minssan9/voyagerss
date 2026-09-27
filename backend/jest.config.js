module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@prisma/client-workschd$': '<rootDir>/node_modules/@prisma/client-workschd',
    '^@prisma/client-aviation$': '<rootDir>/node_modules/@prisma/client-aviation',
    '^@prisma/client-aipr$': '<rootDir>/node_modules/@prisma/client-aipr',
    '^@prisma/client-identity$': '<rootDir>/node_modules/@prisma/client-identity',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
};
