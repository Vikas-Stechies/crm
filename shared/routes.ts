import { z } from 'zod';
import { insertHotelSchema, insertUserSchema, insertBookingSchema, insertAgencySchema, hotels, users, bookings, agencies } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string(), // mapped to email
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  hotels: {
    list: {
      method: 'GET' as const,
      path: '/api/hotels' as const,
      responses: {
        200: z.array(z.custom<typeof hotels.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/hotels' as const,
      input: insertHotelSchema,
      responses: {
        201: z.custom<typeof hotels.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/hotels/:id' as const,
      input: insertHotelSchema.partial(),
      responses: {
        200: z.custom<typeof hotels.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/hotels/:id' as const,
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  agencies: {
    list: {
      method: 'GET' as const,
      path: '/api/agencies' as const,
      responses: {
        200: z.array(z.custom<typeof agencies.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/agencies' as const,
      input: insertAgencySchema,
      responses: {
        201: z.custom<typeof agencies.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/agencies/:id' as const,
      input: insertAgencySchema.partial(),
      responses: {
        200: z.custom<typeof agencies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/agencies/:id' as const,
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings' as const,
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/bookings/:id' as const,
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings' as const,
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/bookings/:id' as const,
      input: insertBookingSchema.partial(),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/bookings/:id' as const,
      responses: {
        200: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  analytics: {
    occupancy: {
      method: 'GET' as const,
      path: '/api/analytics/occupancy' as const,
      responses: {
        200: z.array(z.object({
          date: z.string(),
          occupied: z.number(),
          totalRooms: z.number(),
          percentage: z.number(),
        })),
      },
    },
    forecast: {
      method: 'GET' as const,
      path: '/api/analytics/forecast' as const,
      responses: {
        200: z.array(z.object({
          date: z.string(),
          occupied: z.number(),
          vacant: z.number(),
          checkIns: z.number(),
          checkOuts: z.number(),
          percentage: z.number(),
        })),
      },
    },
    revenue: {
      method: 'GET' as const,
      path: '/api/analytics/revenue' as const,
      responses: {
        200: z.object({
          monthly: z.array(z.object({ name: z.string(), revenue: z.number() })),
          yearly: z.array(z.object({ name: z.string(), revenue: z.number() })),
          // UPDATE THIS SECTION
          byAgency: z.array(z.object({
            name: z.string(),
            revenue: z.number(),
            receipt: z.number().optional(),
            balance: z.number().optional(),
            agencyId: z.number().nullable().optional()
          })),
        }),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Export these for the frontend
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
