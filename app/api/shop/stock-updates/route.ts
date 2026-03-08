import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

const supabase = createClient();

// Initialize Redis for connection management
const redis = Redis.fromEnv();

// Store active connections
const connections = new Map<string, ReadableStreamController<any>>();

// Stock update event emitter
class StockEventEmitter {
  private static instance: StockEventEmitter;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    // Initialize Supabase real-time subscription
    this.setupSupabaseSubscription();
  }

  static getInstance(): StockEventEmitter {
    if (!StockEventEmitter.instance) {
      StockEventEmitter.instance = new StockEventEmitter();
    }
    return StockEventEmitter.instance;
  }

  private async setupSupabaseSubscription() {
    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: 'stock IS NOT NULL',
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Only emit if stock actually changed
          if (newRecord.stock !== oldRecord.stock) {
            this.emit('stock-update', {
              productId: newRecord.id,
              stock: newRecord.stock,
              previousStock: oldRecord.stock,
              timestamp: new Date().toISOString(),
              sku: newRecord.sku,
              name: newRecord.name,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase subscription status: ${status}`);
      });

    // Also listen for low stock alerts
    supabase
      .channel('low-stock')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: 'stock<10',
        },
        (payload) => {
          const newRecord = payload.new as any;
          this.emit('low-stock-alert', {
            productId: newRecord.id,
            stock: newRecord.stock,
            threshold: 10,
            timestamp: new Date().toISOString(),
            sku: newRecord.sku,
            name: newRecord.name,
          });
        }
      )
      .subscribe();
  }

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  unsubscribe(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }
}

// Initialize the event emitter
const stockEmitter = StockEventEmitter.getInstance();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get('productIds')?.split(',') || [];
  const clientId = searchParams.get('clientId') || randomUUID();

  // Set SSE headers
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Create response with SSE headers
  const response = new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });

  // Send initial connection established message
  writer.write(
    encoder.encode(
      `event: connected\ndata: ${JSON.stringify({
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Stock updates stream connected',
        subscribedProducts: productIds,
      })}\n\n`
    )
  );

  // Send initial stock data
  if (productIds.length > 0) {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, stock, name, sku')
        .in('id', productIds);

      if (products) {
        writer.write(
          encoder.encode(
            `event: initial\ndata: ${JSON.stringify({
              products: products.map(p => ({
                productId: p.id,
                stock: p.stock,
                name: p.name,
                sku: p.sku,
              })),
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
      }
    } catch (error) {
      console.error('Error fetching initial stock:', error);
    }
  }

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    writer.write(
      encoder.encode(
        `event: heartbeat\ndata: ${JSON.stringify({
          timestamp: new Date().toISOString(),
        })}\n\n`
      )
    );
  }, 30000);

  // Store connection for broadcasting
  const controller = responseStream.writable.getWriter();
  connections.set(clientId, controller);

  // Handle stock updates
  const handleStockUpdate = (data: any) => {
    // Only send updates for subscribed products
    if (productIds.length === 0 || productIds.includes(data.productId)) {
      writer.write(
        encoder.encode(
          `event: stock-update\ndata: ${JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );
    }
  };

  const handleLowStockAlert = (data: any) => {
    // Send low stock alerts to all connected clients
    if (productIds.length === 0 || productIds.includes(data.productId)) {
      writer.write(
        encoder.encode(
          `event: low-stock-alert\ndata: ${JSON.stringify({
            ...data,
            alert: true,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );
    }
  };

  // Subscribe to events
  stockEmitter.subscribe('stock-update', handleStockUpdate);
  stockEmitter.subscribe('low-stock-alert', handleLowStockAlert);

  // Handle client disconnect
  request.signal.addEventListener('abort', async () => {
    clearInterval(heartbeatInterval);
    stockEmitter.unsubscribe('stock-update', handleStockUpdate);
    stockEmitter.unsubscribe('low-stock-alert', handleLowStockAlert);
    connections.delete(clientId);
    
    try {
      await writer.close();
    } catch (error) {
      console.error('Error closing writer:', error);
    }
    
    console.log(`Client ${clientId} disconnected`);
  });

  console.log(`Client ${clientId} connected for stock updates`);
  return response;
}

// POST endpoint to manually trigger stock updates (for admin use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, stock, action } = body;

    // Validate API key or admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    if (token !== process.env.ADMIN_API_KEY) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!productId) {
      return new Response(JSON.stringify({ error: 'Product ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update stock in database
    const { data: product, error } = await supabase
      .from('products')
      .update({ 
        stock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select('id, stock, name, sku')
      .single();

    if (error) throw error;

    // Emit stock update event
    if (product) {
      stockEmitter.emit('stock-update', {
        productId: product.id,
        stock: product.stock,
        previousStock: null,
        timestamp: new Date().toISOString(),
        sku: product.sku,
        name: product.name,
        manual: true,
      });

      // If stock is low, emit alert
      if (product.stock < 10) {
        stockEmitter.emit('low-stock-alert', {
          productId: product.id,
          stock: product.stock,
          threshold: 10,
          timestamp: new Date().toISOString(),
          sku: product.sku,
          name: product.name,
        });
      }
    }

    // Broadcast to all connected clients
    const encoder = new TextEncoder();
    connections.forEach(async (controller, clientId) => {
      try {
        await controller.write(
          encoder.encode(
            `event: stock-update\ndata: ${JSON.stringify({
              productId: product.id,
              stock: product.stock,
              timestamp: new Date().toISOString(),
              sku: product.sku,
              name: product.name,
              manual: true,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error(`Error broadcasting to client ${clientId}:`, error);
        connections.delete(clientId);
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        product,
        broadcastedTo: connections.size,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error updating stock:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET endpoint to get current stock for multiple products
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('productIds')?.split(',');

    if (!productIds || productIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Product IDs required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, stock, name, sku, low_stock_threshold')
      .in('id', productIds);

    if (error) throw error;

    const stockInfo = products.reduce((acc: any, product) => {
      acc[product.id] = {
        stock: product.stock,
        name: product.name,
        sku: product.sku,
        lowStock: product.stock < (product.low_stock_threshold || 10),
      };
      return acc;
    }, {});

    return new Response(JSON.stringify(stockInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error fetching stock:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE endpoint to clean up stale connections
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Remove specific connection
      const controller = connections.get(clientId);
      if (controller) {
        try {
          await controller.close();
        } catch (error) {
          console.error(`Error closing connection for ${clientId}:`, error);
        }
        connections.delete(clientId);
      }
    } else {
      // Remove all connections (maintenance mode)
      const encoder = new TextEncoder();
      await Promise.all(
        Array.from(connections.entries()).map(async ([id, controller]) => {
          try {
            await controller.write(
              encoder.encode(
                `event: shutdown\ndata: ${JSON.stringify({
                  message: 'Server maintenance',
                  reconnect: true,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
            await controller.close();
          } catch (error) {
            console.error(`Error closing connection for ${id}:`, error);
          }
        })
      );
      connections.clear();
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        removedConnections: clientId ? 1 : connections.size,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error cleaning up connections:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Configuration for edge runtime
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1'], // Deploy to multiple regions
};
