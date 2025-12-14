import swaggerJSDoc from 'swagger-jsdoc'
import { SwaggerDefinition } from 'swagger-jsdoc'

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'KOSPI Fear & Greed Index API',
    version: '1.0.0',
    description: `
      ## KOSPI Fear & Greed Index API Documentation

      This API provides comprehensive data for the Korean stock market fear and greed sentiment analysis.

      ### Features
      - **Fear & Greed Index**: Real-time investor sentiment analysis
      - **Market Data**: KOSPI/KOSDAQ indices and investor trading patterns
      - **Admin Functions**: Data collection management and system monitoring
      - **DART Integration**: Korean corporate disclosure data

      ### Authentication
      Admin endpoints require JWT bearer token authentication.

      ### Rate Limiting
      API calls are rate limited to prevent abuse.
    `,
    contact: {
      name: 'KOSPI FG Index API Support',
      url: 'https://github.com/your-repo/kospi-fg-index',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.kospi-feargreed.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for admin authentication'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'An error occurred'
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      FearGreedIndex: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Fear & Greed index value (0-100)'
          },
          level: {
            type: 'string',
            enum: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'],
            description: 'Market sentiment level'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Date of the index calculation'
          },
          components: {
            type: 'object',
            properties: {
              priceMomentum: {
                type: 'number',
                description: 'Price momentum component score'
              },
              investorSentiment: {
                type: 'number',
                description: 'Investor sentiment component score'
              },
              putCallRatio: {
                type: 'number',
                description: 'Put/Call ratio component score'
              },
              volatilityIndex: {
                type: 'number',
                description: 'Volatility index component score'
              },
              safeHavenDemand: {
                type: 'number',
                description: 'Safe haven demand component score'
              }
            }
          }
        }
      },
      AdminUser: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'User ID'
          },
          username: {
            type: 'string',
            description: 'Username'
          },
          role: {
            type: 'string',
            enum: ['admin', 'viewer'],
            description: 'User role'
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'User permissions'
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            description: 'Last login timestamp'
          }
        }
      },
      SystemHealth: {
        type: 'object',
        properties: {
          database: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['HEALTHY', 'ERROR']
              },
              responseTime: {
                type: 'number',
                description: 'Database response time in milliseconds'
              },
              connections: {
                type: 'number',
                description: 'Active database connections'
              }
            }
          },
          api: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['HEALTHY', 'ERROR']
              },
              responseTime: {
                type: 'number',
                description: 'API response time in milliseconds'
              },
              uptime: {
                type: 'string',
                description: 'Server uptime'
              }
            }
          },
          dataCollection: {
            type: 'object',
            properties: {
              lastRun: {
                type: 'string',
                format: 'date-time'
              },
              status: {
                type: 'string',
                enum: ['IDLE', 'RUNNING', 'ERROR']
              },
              successRate: {
                type: 'number',
                description: 'Success rate percentage'
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Fear & Greed Index',
      description: 'Market sentiment analysis endpoints'
    },
    {
      name: 'Market Data',
      description: 'KOSPI/KOSDAQ market data endpoints'
    },
    {
      name: 'Admin Authentication',
      description: 'Admin login and token management'
    },
    {
      name: 'Admin Data Collection',
      description: 'Data collection management'
    },
    {
      name: 'Admin System',
      description: 'System monitoring and management'
    },
    {
      name: 'DART Data',
      description: 'Korean corporate disclosure data'
    },
    {
      name: 'System',
      description: 'Health checks and system information'
    }
  ]
}

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/middleware/*.ts'
  ]
}

export const swaggerSpec = swaggerJSDoc(options)
export default swaggerSpec