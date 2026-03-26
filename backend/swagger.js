const swaggerJSDoc = require('swagger-jsdoc');

const openapiTags = [
  { name: 'Health', description: 'Service health and connectivity checks.' },
  { name: 'Defects', description: 'Defect CRUD and workflow transitions.' },
  { name: 'RCA', description: 'Root cause analysis (5-Whys) upsert endpoints.' },
  { name: 'Corrective Actions', description: 'Corrective action creation and updates.' },
  { name: 'Analytics', description: 'Dashboard analytics endpoints (Pareto/trends/summary).' },
  { name: 'Audit Export', description: 'Audit-ready export endpoints.' },
  { name: 'Photos', description: 'Defect photo upload and listing.' },
];

/**
 * OpenAPI base definition.
 *
 * Note: This repository currently uses swagger-jsdoc with route-annotation scanning
 * for the implemented endpoints, but we also embed the v1 contract from CodeWiki
 * as an explicit OpenAPI structure so Swagger UI (/docs) and the generated artifact
 * (interfaces/openapi.json) match what the frontend expects under `/api`.
 */
const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Manufacturing Quality Defect Management API',
    version: '1.0.0',
    description:
      'Backend REST API for defect management (v1 contract under /api). Swagger UI is served at /docs.',
  },
  tags: openapiTags,
  paths: {
    // Implemented (current)
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Health endpoint',
        description: 'Basic health check for the backend service.',
        operationId: 'getRootHealth',
        responses: {
          200: {
            description: 'Service health check passed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },

    // v1 contract (CodeWiki) under /api
    '/api/health/': {
      get: {
        tags: ['Health'],
        summary: 'API health endpoint',
        description: 'Health check endpoint used by the frontend to validate connectivity.',
        operationId: 'getApiHealth',
        responses: {
          200: {
            description: 'Service health check passed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },

    '/api/defects/': {
      get: {
        tags: ['Defects'],
        summary: 'List defects',
        description:
          'List defects. Filtering/pagination may be added in later versions; currently represented as optional query params.',
        operationId: 'listDefects',
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Optional status code filter.',
            schema: { type: 'string' },
          },
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Optional free-text search term.',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Optional max items to return.',
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            description: 'Optional offset for pagination.',
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          200: {
            description: 'List of defects',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Defect' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Defects'],
        summary: 'Create defect',
        description: 'Create a defect.',
        operationId: 'createDefect',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DefectCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Defect created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Defect' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/defects/{defectId}/': {
      get: {
        tags: ['Defects'],
        summary: 'Get defect detail',
        description: 'Defect detail (includes nested RCA and actions when available).',
        operationId: 'getDefectById',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        responses: {
          200: {
            description: 'Defect detail',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Defect' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Defects'],
        summary: 'Patch defect',
        description:
          'Partial updates for a defect (e.g., title/description/assignee/due date/status metadata).',
        operationId: 'patchDefect',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DefectPatch' },
            },
          },
        },
        responses: {
          200: {
            description: 'Defect updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Defect' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/defects/{defectId}/transition/': {
      post: {
        tags: ['Defects'],
        summary: 'Transition defect workflow status',
        description:
          'Transition workflow status; request contains `to_status_code`, optional `actor`, optional `message`.',
        operationId: 'transitionDefect',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DefectTransitionRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Defect transitioned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Defect' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/five-whys/by-defect/{defectId}/': {
      put: {
        tags: ['RCA'],
        summary: 'Upsert 5-Whys by defect',
        description: 'Create/update a defect’s 5-Why analysis (upsert by defect).',
        operationId: 'upsertFiveWhysByDefect',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FiveWhysUpsert' },
            },
          },
        },
        responses: {
          200: {
            description: '5-Whys updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FiveWhys' },
              },
            },
          },
          201: {
            description: '5-Whys created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FiveWhys' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/actions/': {
      get: {
        tags: ['Corrective Actions'],
        summary: 'List corrective actions',
        description: 'List corrective actions.',
        operationId: 'listActions',
        parameters: [
          {
            name: 'defectId',
            in: 'query',
            required: false,
            description: 'Optional filter by defect id.',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Optional action status filter.',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of actions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CorrectiveAction' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Corrective Actions'],
        summary: 'Create corrective action',
        description: 'Create a corrective action associated to a defect.',
        operationId: 'createAction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CorrectiveActionCreate' },
            },
          },
        },
        responses: {
          201: {
            description: 'Action created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CorrectiveAction' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    '/api/actions/{actionId}/': {
      patch: {
        tags: ['Corrective Actions'],
        summary: 'Patch corrective action',
        description: 'Update action fields (status, due date, owner, title).',
        operationId: 'patchAction',
        parameters: [{ $ref: '#/components/parameters/ActionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CorrectiveActionPatch' },
            },
          },
        },
        responses: {
          200: {
            description: 'Action updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CorrectiveAction' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/dashboard/': {
      get: {
        tags: ['Analytics'],
        summary: 'Dashboard analytics',
        description:
          'Provide summary metrics and chart-ready series for dashboards (Pareto/trends).',
        operationId: 'getDashboard',
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: false,
            description: 'Optional ISO date-time range start.',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: false,
            description: 'Optional ISO date-time range end.',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'line',
            in: 'query',
            required: false,
            description: 'Optional production line filter.',
            schema: { type: 'string' },
          },
          {
            name: 'partNumber',
            in: 'query',
            required: false,
            description: 'Optional part number filter.',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Dashboard payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardResponse' },
              },
            },
          },
        },
      },
    },

    '/api/defects/export-csv/': {
      get: {
        tags: ['Audit Export'],
        summary: 'Export defects CSV',
        description:
          'Export defect/audit data as CSV; should set Content-Disposition filename.',
        operationId: 'exportDefectsCsv',
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: false,
            description: 'Optional ISO date-time range start.',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: false,
            description: 'Optional ISO date-time range end.',
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          200: {
            description: 'CSV export',
            headers: {
              'Content-Disposition': {
                description: 'Attachment filename header.',
                schema: { type: 'string', example: 'attachment; filename=\'defects_export.csv\'' },
              },
            },
            content: {
              'text/csv': {
                schema: { type: 'string', example: 'id,title,status\n1,Example,OPEN\n' },
              },
            },
          },
        },
      },
    },

    '/api/defects/{defectId}/photos/': {
      post: {
        tags: ['Photos'],
        summary: 'Upload defect photo',
        description:
          'Upload photo attachment (multipart/form-data). Stores binary in object storage and persists metadata.',
        operationId: 'uploadDefectPhoto',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload.',
                  },
                  caption: {
                    type: 'string',
                    description: 'Optional caption/description.',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Photo uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DefectPhoto' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      get: {
        tags: ['Photos'],
        summary: 'List defect photos',
        description: 'List photo attachments for a defect (metadata including URL).',
        operationId: 'listDefectPhotos',
        parameters: [{ $ref: '#/components/parameters/DefectId' }],
        responses: {
          200: {
            description: 'List of photo attachments',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/DefectPhoto' },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    parameters: {
      DefectId: {
        name: 'defectId',
        in: 'path',
        required: true,
        description: 'Defect identifier.',
        schema: { type: 'string', example: 'def_123' },
      },
      ActionId: {
        name: 'actionId',
        in: 'path',
        required: true,
        description: 'Corrective action identifier.',
        schema: { type: 'string', example: 'act_456' },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    schemas: {
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          message: { type: 'string', example: 'Service is healthy' },
          timestamp: { type: 'string', format: 'date-time' },
          environment: { type: 'string', example: 'development' },
        },
        required: ['status', 'message', 'timestamp', 'environment'],
        additionalProperties: false,
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'object',
            description: 'Optional error details payload.',
            additionalProperties: true,
          },
        },
        required: ['status', 'message'],
        additionalProperties: false,
      },

      FiveWhyItem: {
        type: 'object',
        properties: {
          why: { type: 'integer', minimum: 1, maximum: 5, example: 1 },
          text: { type: 'string', example: 'Why did the defect occur?' },
        },
        required: ['why', 'text'],
        additionalProperties: false,
      },

      FiveWhys: {
        type: 'object',
        properties: {
          defectId: { type: 'string', example: 'def_123' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/FiveWhyItem' },
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['defectId', 'items'],
        additionalProperties: false,
      },

      FiveWhysUpsert: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'The 5-Whys items for the defect (1..5 entries).',
            minItems: 1,
            maxItems: 5,
            items: { $ref: '#/components/schemas/FiveWhyItem' },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },

      CorrectiveAction: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'act_456' },
          defectId: { type: 'string', example: 'def_123' },
          title: { type: 'string', example: 'Adjust torque setting' },
          owner: { type: 'string', example: 'jsmith' },
          status: { type: 'string', example: 'OPEN' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'defectId', 'title', 'status', 'createdAt', 'updatedAt'],
        additionalProperties: false,
      },

      CorrectiveActionCreate: {
        type: 'object',
        properties: {
          defectId: { type: 'string', example: 'def_123' },
          title: { type: 'string', example: 'Adjust torque setting' },
          owner: { type: 'string', example: 'jsmith' },
          dueDate: { type: 'string', format: 'date-time' },
        },
        required: ['defectId', 'title'],
        additionalProperties: false,
      },

      CorrectiveActionPatch: {
        type: 'object',
        description: 'All fields optional; only supplied fields are updated.',
        properties: {
          title: { type: 'string', example: 'Update work instruction WI-42' },
          owner: { type: 'string', example: 'jsmith' },
          status: { type: 'string', example: 'IN_PROGRESS' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
        additionalProperties: false,
      },

      Defect: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'def_123' },
          title: { type: 'string', example: 'Scratch on painted surface' },
          description: { type: 'string', example: 'Observed on station 4 during inspection.' },
          statusCode: { type: 'string', example: 'OPEN' },
          priority: { type: 'string', example: 'MEDIUM' },
          assignee: { type: 'string', nullable: true, example: 'jsmith' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          rca: { $ref: '#/components/schemas/FiveWhys' },
          actions: {
            type: 'array',
            items: { $ref: '#/components/schemas/CorrectiveAction' },
          },
        },
        required: ['id', 'title', 'statusCode', 'createdAt', 'updatedAt'],
        additionalProperties: false,
      },

      DefectCreate: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Scratch on painted surface' },
          description: { type: 'string', example: 'Observed on station 4 during inspection.' },
          priority: { type: 'string', example: 'MEDIUM' },
          assignee: { type: 'string', example: 'jsmith' },
          dueDate: { type: 'string', format: 'date-time' },
        },
        required: ['title'],
        additionalProperties: false,
      },

      DefectPatch: {
        type: 'object',
        description: 'All fields optional; only supplied fields are updated.',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string' },
          assignee: { type: 'string', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          statusCode: { type: 'string' },
        },
        additionalProperties: false,
      },

      DefectTransitionRequest: {
        type: 'object',
        properties: {
          to_status_code: { type: 'string', example: 'INVESTIGATING' },
          actor: { type: 'string', description: 'Optional actor identifier.', example: 'jsmith' },
          message: {
            type: 'string',
            description: 'Optional transition note.',
            example: 'Starting investigation.',
          },
        },
        required: ['to_status_code'],
        additionalProperties: false,
      },

      DefectPhoto: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ph_789' },
          defectId: { type: 'string', example: 'def_123' },
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://object-store.example.com/defects/def_123/ph_789.jpg',
          },
          filename: { type: 'string', example: 'photo.jpg' },
          mimeType: { type: 'string', example: 'image/jpeg' },
          sizeBytes: { type: 'integer', example: 345678 },
          caption: { type: 'string', nullable: true, example: 'Close-up of scratch' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'defectId', 'url', 'filename', 'mimeType', 'sizeBytes', 'createdAt'],
        additionalProperties: false,
      },

      DashboardResponse: {
        type: 'object',
        description: 'Chart-ready analytics payload for dashboards.',
        properties: {
          summary: {
            type: 'object',
            properties: {
              totalDefects: { type: 'integer', example: 120 },
              openDefects: { type: 'integer', example: 23 },
              overdueActions: { type: 'integer', example: 5 },
            },
            additionalProperties: false,
          },
          pareto: {
            type: 'array',
            description: 'Pareto series: category + count (sorted descending).',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', example: 'Cosmetic' },
                count: { type: 'integer', example: 42 },
              },
              required: ['category', 'count'],
              additionalProperties: false,
            },
          },
          trends: {
            type: 'array',
            description: 'Trend series: time bucket + count.',
            items: {
              type: 'object',
              properties: {
                bucket: { type: 'string', example: '2026-03-01' },
                count: { type: 'integer', example: 7 },
              },
              required: ['bucket', 'count'],
              additionalProperties: false,
            },
          },
        },
        required: ['summary', 'pareto', 'trends'],
        additionalProperties: false,
      },
    },
  },
};

const options = {
  definition,
  // Keep scanning current implemented routes so the '/' health endpoint stays in sync if the code changes,
  // but note that we also provide explicit paths above for the v1 contract.
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
