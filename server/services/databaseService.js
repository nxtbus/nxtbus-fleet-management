/**
 * Database Service for NxtBus - PostgreSQL (Neon)
 * Replaces JSON file storage with proper database
 */

require('dotenv').config();
const { Pool } = require('pg');

// Fallback data for when database is not available
const getFallbackData = async () => {
  const bcrypt = require('bcryptjs');
  
  return {
    buses: [
      { id: 'BUS001', number: '101A', type: 'AC', capacity: 40, status: 'active', ownerId: 'OWN001', assignedDrivers: ['DRV001', 'DRV003'], assignedRoutes: [], createdAt: '2024-01-15' },
      { id: 'BUS002', number: '102B', type: 'Non-AC', capacity: 50, status: 'active', ownerId: 'OWN001', assignedDrivers: ['DRV001'], assignedRoutes: [], createdAt: '2024-01-20' },
      { id: 'BUS003', number: '103C', type: 'AC', capacity: 40, status: 'maintenance', ownerId: 'OWN002', assignedDrivers: ['DRV002'], assignedRoutes: [], createdAt: '2024-02-01' }
    ],
    routes: [
      {
        id: 'ROUTE001', name: 'Central Station → Airport', startPoint: 'Central Station', endPoint: 'Airport Terminal',
        startLat: 12.9716, startLon: 77.5946, endLat: 13.1989, endLon: 77.7068, estimatedDuration: 90, status: 'active',
        stops: [
          { id: 'S1', name: 'Central Station', lat: 12.9716, lon: 77.5946, order: 1, estimatedTime: 0 },
          { id: 'S2', name: 'MG Road', lat: 13.0100, lon: 77.6000, order: 2, estimatedTime: 15 },
          { id: 'S3', name: 'Indiranagar', lat: 13.0200, lon: 77.6400, order: 3, estimatedTime: 30 },
          { id: 'S4', name: 'Whitefield', lat: 13.0500, lon: 77.7000, order: 4, estimatedTime: 55 },
          { id: 'S5', name: 'Airport Terminal', lat: 13.1989, lon: 77.7068, order: 5, estimatedTime: 90 }
        ]
      }
    ],
    drivers: [
      { id: 'DRV001', name: 'Rajesh Kumar', phone: '9876543210', password: await bcrypt.hash('1234', 10), status: 'active', assignedBuses: ['BUS001', 'BUS002'], lastLogin: null },
      { id: 'DRV002', name: 'Suresh Patel', phone: '9876543211', password: await bcrypt.hash('5678', 10), status: 'active', assignedBuses: ['BUS003'], lastLogin: null },
      { id: 'DRV003', name: 'Amit Singh', phone: '9876543212', password: await bcrypt.hash('9012', 10), status: 'active', assignedBuses: ['BUS001'], lastLogin: null }
    ],
    owners: [
      { id: 'OWN001', name: 'Sharma Transport', email: 'sharma@transport.com', phone: '9876500001', password: await bcrypt.hash('1234', 10), address: 'Bangalore', status: 'active', createdAt: '2024-01-01', lastLogin: null },
      { id: 'OWN002', name: 'Patel Bus Services', email: 'patel@busservices.com', phone: '9876500002', password: await bcrypt.hash('5678', 10), address: 'Mangalore', status: 'active', createdAt: '2024-01-10', lastLogin: null }
    ],
    admins: [
      { id: 'ADM001', username: 'admin', password: await bcrypt.hash('admin123', 10), name: 'System Administrator', email: 'admin@nxtbus.com', role: 'admin', status: 'active', createdAt: '2024-01-01', lastLogin: null }
    ],
    activeTrips: [],
    schedules: [],
    notifications: [],
    feedbacks: [],
    delays: [],
    callAlerts: []
  };
};

let fallbackData = null;

class DatabaseService {
  constructor() {
    console.log('🔗 Initializing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set!');
      console.error('⚠️ Running in fallback mode without database connection');
      this.pool = null;
      this.fallbackMode = true;
      this.initializeFallbackData();
      return;
    }
    
    this.fallbackMode = false;
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection on startup
    this.testConnection();
  }

  async initializeFallbackData() {
    if (!fallbackData) {
      console.log('🔄 Initializing fallback data with hashed passwords...');
      fallbackData = await getFallbackData();
      console.log('✅ Fallback data initialized');
    }
  }

  async testConnection() {
    if (this.fallbackMode) {
      console.log('⚠️ Skipping database connection test - running in fallback mode');
      return;
    }
    
    try {
      console.log('🔍 Testing database connection...');
      const client = await this.pool.connect();
      console.log('✅ Database connected successfully');
      
      // Test a simple query to verify tables exist
      try {
        const testResult = await client.query('SELECT COUNT(*) FROM routes');
        console.log(`✅ Routes table accessible - ${testResult.rows[0].count} routes found`);
      } catch (tableError) {
        console.warn('⚠️ Routes table query failed:', tableError.message);
        console.warn('⚠️ This might indicate schema issues - will use fallback mode');
        this.fallbackMode = true;
        await this.initializeFallbackData();
      }
      
      client.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Full error:', error);
      console.warn('⚠️ Switching to fallback mode');
      this.fallbackMode = true;
      await this.initializeFallbackData();
    }
  }

  async query(text, params) {
    if (this.fallbackMode) {
      console.warn('⚠️ Database query attempted in fallback mode - returning empty result');
      return { rows: [] };
    }
    
    try {
      const client = await this.pool.connect();
      try {
        console.log(`🔍 Executing query: ${text.substring(0, 50)}...`);
        const result = await client.query(text, params);
        console.log(`✅ Query successful - ${result.rows.length} rows returned`);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      
      // Check for specific error types
      if (error.code === '42P01') {
        console.error('❌ Table does not exist - switching to fallback mode');
      } else if (error.code === '42703') {
        console.error('❌ Column does not exist - switching to fallback mode');
      } else {
        console.error('❌ Database error code:', error.code);
      }
      
      console.warn('⚠️ Switching to fallback mode due to database error');
      
      // Switch to fallback mode on database errors
      this.fallbackMode = true;
      await this.initializeFallbackData();
      
      return { rows: [] };
    }
  }

  // ============ BUSES ============
  
  async getBuses() {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback data for buses');
      return fallbackData.buses;
    }
    
    try {
      const result = await this.query('SELECT * FROM buses ORDER BY created_at DESC');
      
      console.log(`🔍 Database query result: ${result.rows.length} buses found`);
      
      // Map database fields (snake_case) to frontend fields (camelCase)
      const mappedBuses = result.rows.map(bus => ({
        id: bus.id,
        number: bus.number,
        type: bus.type,
        capacity: bus.capacity,
        status: bus.status || 'active',
        ownerId: bus.owner_id,
        assignedDrivers: bus.assigned_drivers || [],
        assignedRoutes: bus.assigned_routes || [],
        createdAt: bus.created_at,
        updatedAt: bus.updated_at
      }));
      
      console.log(`✅ Returning ${mappedBuses.length} mapped buses from database`);
      return mappedBuses;
    } catch (error) {
      console.error('❌ getBuses failed, using fallback data:', error.message);
      await this.initializeFallbackData();
      return fallbackData.buses;
    }
  }

  async getBusById(id) {
    const result = await this.query('SELECT * FROM buses WHERE id = $1', [id]);
    return result.rows[0];
  }

  async addBus(busData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addBus');
      
      // Generate ID if not provided
      const busId = busData.id || `BUS${String(fallbackData.buses.length + 1).padStart(3, '0')}`;
      
      const newBus = {
        id: busId,
        number: busData.number,
        model: busData.model,
        year: busData.year,
        type: busData.type,
        capacity: busData.capacity,
        fuelType: busData.fuel_type,
        ownerId: busData.owner_id,
        status: busData.status || 'active',
        assignedDrivers: busData.assigned_drivers || [],
        assignedRoutes: busData.assigned_routes || [],
        createdAt: new Date().toISOString()
      };
      
      fallbackData.buses.push(newBus);
      return newBus;
    }
    
    const { id, number, model, year, capacity, fuel_type, owner_id, type, status = 'active', assigned_drivers = [], assigned_routes = [] } = busData;
    const result = await this.query(
      `INSERT INTO buses (id, number, model, year, capacity, fuel_type, owner_id, type, status, assigned_drivers, assigned_routes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [id, number, model, year, capacity, fuel_type, owner_id, type, status, JSON.stringify(assigned_drivers), JSON.stringify(assigned_routes)]
    );
    
    // Map database fields back to camelCase
    const bus = result.rows[0];
    return {
      id: bus.id,
      number: bus.number,
      model: bus.model,
      year: bus.year,
      capacity: bus.capacity,
      fuelType: bus.fuel_type,
      ownerId: bus.owner_id,
      type: bus.type,
      status: bus.status,
      assignedDrivers: bus.assigned_drivers || [],
      assignedRoutes: bus.assigned_routes || [],
      createdAt: bus.created_at,
      updatedAt: bus.updated_at
    };
  }

  async updateBus(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateBus');
      
      const index = fallbackData.buses.findIndex(b => b.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.buses[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.buses[index];
    }
    
    // Filter out undefined values to only update provided fields
    const filteredUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      // If no fields to update, just return the existing bus
      const result = await this.query('SELECT * FROM buses WHERE id = $1', [id]);
      return result.rows[0];
    }
    
    const fields = Object.keys(filteredUpdates).map((key, index) => `${key} = ${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await this.query(
      `UPDATE buses SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }
    

  async deleteBus(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteBus');
      
      const index = fallbackData.buses.findIndex(b => b.id === id);
      if (index === -1) return null;
      
      fallbackData.buses[index].status = 'deleted';
      return { success: true };
    }
    
    await this.query('UPDATE buses SET status = $1 WHERE id = $2', ['deleted', id]);
    return { success: true };
  }

  // ============ ROUTES ============
  
  async getRoutes() {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback data for routes');
      return fallbackData.routes;
    }
    
    try {
      const result = await this.query('SELECT * FROM routes ORDER BY created_at DESC');
      
      console.log(`🔍 Database query result: ${result.rows.length} routes found`);
      
      // Map database fields (snake_case) to frontend fields (camelCase)
      const mappedRoutes = result.rows.map(route => ({
        id: route.id,
        name: route.name,
        startPoint: route.start_point,
        endPoint: route.end_point,
        startLat: route.start_lat,
        startLon: route.start_lon,
        endLat: route.end_lat,
        endLon: route.end_lon,
        estimatedDuration: route.estimated_duration,
        status: route.status || 'active',
        stops: route.stops || [],
        createdAt: route.created_at,
        updatedAt: route.updated_at
      }));
      
      console.log(`✅ Returning ${mappedRoutes.length} mapped routes from database`);
      return mappedRoutes;
    } catch (error) {
      console.error('❌ getRoutes failed, using fallback data:', error.message);
      await this.initializeFallbackData();
      return fallbackData.routes;
    }
  }

  async getRouteById(id) {
    const result = await this.query('SELECT * FROM routes WHERE id = $1', [id]);
    return result.rows[0];
  }

  async addRoute(routeData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addRoute');
      
      const routeId = routeData.id || `ROUTE${String(fallbackData.routes.length + 1).padStart(3, '0')}`;
      
      const newRoute = {
        id: routeId,
        name: routeData.name,
        startPoint: routeData.start_point,
        endPoint: routeData.end_point,
        startLat: routeData.start_lat,
        startLon: routeData.start_lon,
        endLat: routeData.end_lat,
        endLon: routeData.end_lon,
        estimatedDuration: routeData.estimated_duration,
        distance: routeData.distance,
        fare: routeData.fare,
        stops: routeData.stops || [],
        status: routeData.status || 'active',
        createdAt: new Date().toISOString()
      };
      
      fallbackData.routes.push(newRoute);
      return newRoute;
    }
    
    const { 
      id, name, start_point, end_point, start_lat, start_lon, 
      end_lat, end_lon, estimated_duration, distance, fare, stops, status = 'active' 
    } = routeData;
    
    const result = await this.query(
      `INSERT INTO routes (id, name, start_point, end_point, start_lat, start_lon, end_lat, end_lon, 
       estimated_duration, distance, fare, stops, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [id, name, start_point, end_point, start_lat, start_lon, end_lat, end_lon, 
       estimated_duration, distance, fare, JSON.stringify(stops), status]
    );
    
    // Map database fields back to camelCase
    const route = result.rows[0];
    return {
      id: route.id,
      name: route.name,
      startPoint: route.start_point,
      endPoint: route.end_point,
      startLat: route.start_lat,
      startLon: route.start_lon,
      endLat: route.end_lat,
      endLon: route.end_lon,
      estimatedDuration: route.estimated_duration,
      distance: route.distance,
      fare: route.fare,
      stops: route.stops || [],
      status: route.status,
      createdAt: route.created_at
    };
  }

  async updateRoute(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateRoute');
      
      const index = fallbackData.routes.findIndex(r => r.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.routes[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.routes[index];
    }
    
    if (updates.stops) {
      updates.stops = JSON.stringify(updates.stops);
    }
    
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE routes SET ${fields} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteRoute(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteRoute');
      
      const index = fallbackData.routes.findIndex(r => r.id === id);
      if (index === -1) return null;
      
      fallbackData.routes[index].status = 'deleted';
      return { success: true };
    }
    
    await this.query('UPDATE routes SET status = $1 WHERE id = $2', ['deleted', id]);
    return { success: true };
  }

  // ============ ACTIVE TRIPS ============
  
  async getActiveTrips() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for active trips');
      return fallbackData.activeTrips.filter(t => t.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM active_trips WHERE status = $1 ORDER BY created_at DESC', ['active']);
    return result.rows.map(row => ({
      ...row,
      current_gps: row.current_gps,
      previous_gps: row.previous_gps
    }));
  }

  async getTripById(id) {
    const result = await this.query('SELECT * FROM active_trips WHERE id = $1', [id]);
    if (result.rows[0]) {
      return {
        ...result.rows[0],
        current_gps: result.rows[0].current_gps,
        previous_gps: result.rows[0].previous_gps
      };
    }
    return null;
  }

  async addTrip(tripData) {
    const {
      id, trip_id, bus_id, driver_id, driver_name, route_id, route_name, owner_id,
      status = 'active', start_time, estimated_end_time, current_gps, previous_gps,
      max_speed, avg_speed, gps_update_count = 0, overspeed_count = 0,
      last_overspeed, last_update, progress = 0, current_stop_id, next_stop_id, estimated_arrival
    } = tripData;

    const result = await this.query(
      `INSERT INTO active_trips (
        id, trip_id, bus_id, driver_id, driver_name, route_id, route_name, owner_id,
        status, start_time, estimated_end_time, current_gps, previous_gps,
        max_speed, avg_speed, gps_update_count, overspeed_count,
        last_overspeed, last_update, progress, current_stop_id, next_stop_id, 
        estimated_arrival, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
      RETURNING *`,
      [id, trip_id, bus_id, driver_id, driver_name, route_id, route_name, owner_id,
       status, start_time, estimated_end_time, JSON.stringify(current_gps), JSON.stringify(previous_gps),
       max_speed, avg_speed, gps_update_count, overspeed_count,
       last_overspeed, last_update, progress, current_stop_id, next_stop_id, estimated_arrival]
    );
    
    return {
      ...result.rows[0],
      current_gps: result.rows[0].current_gps,
      previous_gps: result.rows[0].previous_gps
    };
  }

  async updateTrip(id, updates) {
    if (updates.current_gps) {
      updates.current_gps = JSON.stringify(updates.current_gps);
    }
    if (updates.previous_gps) {
      updates.previous_gps = JSON.stringify(updates.previous_gps);
    }
    
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE active_trips SET ${fields} WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows[0]) {
      return {
        ...result.rows[0],
        current_gps: result.rows[0].current_gps,
        previous_gps: result.rows[0].previous_gps
      };
    }
    return null;
  }

  // ============ SCHEDULES ============
  
  async getSchedules() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for schedules');
      return fallbackData.schedules.filter(s => s.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM schedules WHERE status = $1 ORDER BY created_at DESC', ['active']);
    
    // Map snake_case to camelCase for frontend
    return result.rows.map(row => ({
      id: row.id,
      busId: row.bus_id,
      routeId: row.route_id,
      busNumber: row.bus_number,
      routeName: row.route_name,
      driverName: row.driver_name,
      startTime: row.start_time,
      endTime: row.end_time,
      days: row.days,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  async addSchedule(scheduleData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addSchedule');
      
      const scheduleId = scheduleData.id || `SCH${String(fallbackData.schedules.length + 1).padStart(3, '0')}`;
      
      const newSchedule = {
        id: scheduleId,
        busId: scheduleData.bus_id,
        routeId: scheduleData.route_id,
        busNumber: scheduleData.bus_number,
        routeName: scheduleData.route_name,
        driverName: scheduleData.driver_name,
        startTime: scheduleData.start_time,
        endTime: scheduleData.end_time,
        days: scheduleData.days,
        status: scheduleData.status || 'active',
        createdAt: new Date().toISOString()
      };
      
      fallbackData.schedules.push(newSchedule);
      return newSchedule;
    }
    
    const { id, bus_id, route_id, bus_number, route_name, driver_name, start_time, end_time, days, status = 'active' } = scheduleData;
    
    const result = await this.query(
      `INSERT INTO schedules (id, bus_id, route_id, bus_number, route_name, driver_name, start_time, end_time, days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) RETURNING *`,
      [id, bus_id, route_id, bus_number, route_name, driver_name, start_time, end_time, days, status]
    );
    
    // Map snake_case to camelCase for frontend
    const row = result.rows[0];
    return {
      id: row.id,
      busId: row.bus_id,
      routeId: row.route_id,
      busNumber: row.bus_number,
      routeName: row.route_name,
      driverName: row.driver_name,
      startTime: row.start_time,
      endTime: row.end_time,
      days: row.days,
      status: row.status,
      createdAt: row.created_at
    };
  }

  async updateSchedule(id, scheduleData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateSchedule');
      
      const index = fallbackData.schedules.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(scheduleData).forEach(key => {
        if (scheduleData[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.schedules[index][camelKey] = scheduleData[key];
        }
      });
      
      return fallbackData.schedules[index];
    }
    
    const { bus_id, route_id, bus_number, route_name, driver_name, start_time, end_time, days, status } = scheduleData;
    
    const result = await this.query(
      `UPDATE schedules 
       SET bus_id = $1, route_id = $2, bus_number = $3, route_name = $4, 
           driver_name = $5, start_time = $6, end_time = $7, days = $8, status = $9
       WHERE id = $10 RETURNING *`,
      [bus_id, route_id, bus_number, route_name, driver_name, start_time, end_time, days, status, id]
    );
    
    // Map snake_case to camelCase for frontend
    const row = result.rows[0];
    if (!row) return null;
    
    return {
      id: row.id,
      busId: row.bus_id,
      routeId: row.route_id,
      busNumber: row.bus_number,
      routeName: row.route_name,
      driverName: row.driver_name,
      startTime: row.start_time,
      endTime: row.end_time,
      days: row.days,
      status: row.status,
      createdAt: row.created_at
    };
  }

  async deleteSchedule(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteSchedule');
      
      const index = fallbackData.schedules.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      const deleted = fallbackData.schedules.splice(index, 1)[0];
      return deleted;
    }
    
    const result = await this.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // ============ NOTIFICATIONS ============
  
  async getNotifications() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for notifications');
      return fallbackData.notifications.filter(n => n.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM notifications WHERE status = $1 ORDER BY sent_at DESC', ['active']);
    return result.rows;
  }

  async addNotification(notificationData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addNotification');
      
      const notificationId = notificationData.id || `NOT${String(fallbackData.notifications.length + 1).padStart(3, '0')}`;
      
      const newNotification = {
        id: notificationId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        priority: notificationData.priority || 'medium',
        targetAudience: notificationData.target_audience,
        expiresAt: notificationData.expires_at,
        status: notificationData.status || 'active',
        sentAt: new Date().toISOString()
      };
      
      fallbackData.notifications.push(newNotification);
      return newNotification;
    }
    
    const { id, title, message, type, priority = 'medium', target_audience, expires_at, status = 'active' } = notificationData;
    
    const result = await this.query(
      `INSERT INTO notifications (id, title, message, type, priority, target_audience, expires_at, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
      [id, title, message, type, priority, target_audience, expires_at, status]
    );
    
    // Map database fields back to camelCase
    const notification = result.rows[0];
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      targetAudience: notification.target_audience,
      expiresAt: notification.expires_at,
      status: notification.status,
      sentAt: notification.sent_at
    };
  }

  async updateNotification(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateNotification');
      
      const index = fallbackData.notifications.findIndex(n => n.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.notifications[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.notifications[index];
    }
    
    // Filter out undefined values
    const filteredUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      const result = await this.query('SELECT * FROM notifications WHERE id = $1', [id]);
      return result.rows[0];
    }
    
    const fields = Object.keys(filteredUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await this.query(
      `UPDATE notifications SET ${fields} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteNotification(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteNotification');
      
      const index = fallbackData.notifications.findIndex(n => n.id === id);
      if (index === -1) return null;
      
      const deleted = fallbackData.notifications.splice(index, 1)[0];
      return deleted;
    }
    
    const result = await this.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // ============ FEEDBACKS ============
  
  async getFeedbacks() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for feedbacks');
      return fallbackData.feedbacks;
    }
    
    const result = await this.query('SELECT * FROM feedbacks ORDER BY submitted_at DESC');
    return result.rows;
  }

  async addFeedback(feedbackData) {
    const { id, user_name, user_email, bus_number, route_name, rating, feedback_text, category, status = 'pending' } = feedbackData;
    
    const result = await this.query(
      `INSERT INTO feedbacks (id, user_name, user_email, bus_number, route_name, rating, feedback_text, category, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) RETURNING *`,
      [id, user_name, user_email, bus_number, route_name, rating, feedback_text, category, status]
    );
    return result.rows[0];
  }

  // ============ DELAYS ============
  
  async getDelays() {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback data for delays');
      return fallbackData.delays;
    }
    
    try {
      const result = await this.query('SELECT * FROM delays ORDER BY reported_at DESC');
      
      console.log(`🔍 Database query result: ${result.rows.length} delays found`);
      console.log(`✅ Returning ${result.rows.length} delays from database`);
      return result.rows;
    } catch (error) {
      console.error('❌ getDelays failed, using fallback data:', error.message);
      await this.initializeFallbackData();
      return fallbackData.delays;
    }
  }

  async addDelay(delayData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addDelay');
      
      const delayId = delayData.id || `DEL${String(fallbackData.delays.length + 1).padStart(3, '0')}`;
      
      const newDelay = {
        id: delayId,
        busId: delayData.bus_id,
        busNumber: delayData.bus_number,
        routeId: delayData.route_id,
        delayMinutes: delayData.delay_minutes,
        reason: delayData.reason,
        status: delayData.status || 'active',
        reportedAt: new Date().toISOString()
      };
      
      fallbackData.delays.push(newDelay);
      return newDelay;
    }
    
    const { id, bus_id, bus_number, route_id, delay_minutes, reason, status = 'active' } = delayData;
    
    const result = await this.query(
      `INSERT INTO delays (id, bus_id, bus_number, route_id, delay_minutes, reason, status, reported_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [id, bus_id, bus_number, route_id, delay_minutes, reason, status]
    );
    
    // Map database fields back to camelCase
    const delay = result.rows[0];
    return {
      id: delay.id,
      busId: delay.bus_id,
      busNumber: delay.bus_number,
      routeId: delay.route_id,
      delayMinutes: delay.delay_minutes,
      reason: delay.reason,
      status: delay.status,
      reportedAt: delay.reported_at
    };
  }

  async updateDelay(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateDelay');
      
      const index = fallbackData.delays.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.delays[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.delays[index];
    }
    
    // Filter out undefined values
    const filteredUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      const result = await this.query('SELECT * FROM delays WHERE id = $1', [id]);
      return result.rows[0];
    }
    
    const fields = Object.keys(filteredUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await this.query(
      `UPDATE delays SET ${fields} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteDelay(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteDelay');
      
      const index = fallbackData.delays.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      const deleted = fallbackData.delays.splice(index, 1)[0];
      return deleted;
    }
    
    const result = await this.query('DELETE FROM delays WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // ============ CALL ALERTS ============
  
  async getCallAlerts() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for call alerts');
      return fallbackData.callAlerts.filter(c => c.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM call_alerts WHERE status = $1 ORDER BY created_at DESC', ['active']);
    return result.rows;
  }

  async addCallAlert(alertData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addCallAlert');
      
      const alertId = alertData.id || `CALL${String(fallbackData.callAlerts.length + 1).padStart(3, '0')}`;
      
      const newAlert = {
        id: alertId,
        tripId: alertData.trip_id,
        busId: alertData.bus_id,
        busNumber: alertData.bus_number,
        driverId: alertData.driver_id,
        driverName: alertData.driver_name,
        routeId: alertData.route_id,
        routeName: alertData.route_name,
        ownerId: alertData.owner_id,
        callType: alertData.call_type,
        callStatus: alertData.call_status,
        alertType: alertData.alert_type,
        message: alertData.message,
        priority: alertData.priority || 'medium',
        timestamp: alertData.timestamp || new Date().toISOString(),
        location: alertData.location,
        status: alertData.status || 'active',
        acknowledged: alertData.acknowledged || false,
        createdAt: new Date().toISOString()
      };
      
      fallbackData.callAlerts.push(newAlert);
      return newAlert;
    }
    
    const { id, driver_id, driver_name, bus_number, alert_type, message, priority = 'medium', status = 'active', trip_id, bus_id, route_id, route_name, owner_id, call_type, call_status, timestamp, location, acknowledged = false } = alertData;
    
    const result = await this.query(
      `INSERT INTO call_alerts (id, trip_id, bus_id, bus_number, driver_id, driver_name, route_id, route_name, owner_id, call_type, call_status, alert_type, message, priority, timestamp, location, status, acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP) RETURNING *`,
      [id, trip_id, bus_id, bus_number, driver_id, driver_name, route_id, route_name, owner_id, call_type, call_status, alert_type, message, priority, timestamp, JSON.stringify(location), status, acknowledged]
    );
    
    // Map database fields back to camelCase
    const alert = result.rows[0];
    return {
      id: alert.id,
      tripId: alert.trip_id,
      busId: alert.bus_id,
      busNumber: alert.bus_number,
      driverId: alert.driver_id,
      driverName: alert.driver_name,
      routeId: alert.route_id,
      routeName: alert.route_name,
      ownerId: alert.owner_id,
      callType: alert.call_type,
      callStatus: alert.call_status,
      alertType: alert.alert_type,
      message: alert.message,
      priority: alert.priority,
      timestamp: alert.timestamp,
      location: alert.location,
      status: alert.status,
      acknowledged: alert.acknowledged,
      createdAt: alert.created_at
    };
  }

  async updateCallAlert(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateCallAlert');
      
      const index = fallbackData.callAlerts.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.callAlerts[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.callAlerts[index];
    }
    
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE call_alerts SET ${fields} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteCallAlert(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteCallAlert');
      
      const index = fallbackData.callAlerts.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      fallbackData.callAlerts[index].status = 'deleted';
      return { success: true };
    }
    
    await this.query('UPDATE call_alerts SET status = $1 WHERE id = $2', ['deleted', id]);
    return { success: true };
  }

  // ============ OWNERS ============
  
  async getOwners() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for owners');
      return fallbackData.owners.filter(o => o.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM owners WHERE status = $1 ORDER BY created_at DESC', ['active']);
    return result.rows;
  }

  async getOwnerById(id) {
    const result = await this.query('SELECT * FROM owners WHERE id = $1', [id]);
    return result.rows[0];
  }

  async addOwner(ownerData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addOwner');
      
      const ownerId = ownerData.id || `OWN${String(fallbackData.owners.length + 1).padStart(3, '0')}`;
      
      const newOwner = {
        id: ownerId,
        name: ownerData.name,
        email: ownerData.email,
        phone: ownerData.phone,
        password: ownerData.password,
        companyName: ownerData.company_name,
        licenseNumber: ownerData.license_number,
        address: ownerData.address,
        status: ownerData.status || 'active',
        createdAt: new Date().toISOString()
      };
      
      fallbackData.owners.push(newOwner);
      return newOwner;
    }
    
    const { id, name, email, phone, password, company_name, license_number, address, status = 'active' } = ownerData;
    const result = await this.query(
      `INSERT INTO owners (id, name, email, phone, password, company_name, license_number, address, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [id, name, email, phone, password, company_name, license_number, address, status]
    );
    return result.rows[0];
  }

  async updateOwner(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateOwner');
      
      const index = fallbackData.owners.findIndex(o => o.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.owners[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.owners[index];
    }
    
    // Filter out undefined values
    const filteredUpdates = Object.entries(updates)
      .filter(([key, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      const result = await this.query('SELECT * FROM owners WHERE id = $1', [id]);
      return result.rows[0];
    }
    
    const fields = Object.keys(filteredUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await this.query(
      `UPDATE owners SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteOwner(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteOwner');
      
      const index = fallbackData.owners.findIndex(o => o.id === id);
      if (index === -1) return null;
      
      fallbackData.owners[index].status = 'deleted';
      return { success: true };
    }
    
    await this.query('UPDATE owners SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['deleted', id]);
    return { success: true };
  }

  // ============ DRIVERS ============
  
  async getDrivers() {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback data for drivers');
      return fallbackData.drivers;
    }
    
    try {
      const result = await this.query('SELECT * FROM drivers ORDER BY created_at DESC');
      
      console.log(`🔍 Database query result: ${result.rows.length} drivers found`);
      
      // Map database fields (snake_case) to frontend fields (camelCase)
      const mappedDrivers = result.rows.map(driver => ({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        password: driver.password,
        licenseNumber: driver.license_number,
        experienceYears: driver.experience_years,
        status: driver.status || 'active',
        assignedBuses: driver.assigned_buses || [],
        createdAt: driver.created_at,
        updatedAt: driver.updated_at,
        lastLogin: driver.last_login
      }));
      
      console.log(`✅ Returning ${mappedDrivers.length} mapped drivers from database`);
      return mappedDrivers;
    } catch (error) {
      console.error('❌ getDrivers failed, using fallback data:', error.message);
      await this.initializeFallbackData();
      return fallbackData.drivers;
    }
  }

  async getDriverById(id) {
    const result = await this.query('SELECT * FROM drivers WHERE id = $1', [id]);
    return result.rows[0];
  }

  async addDriver(driverData) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for addDriver');
      
      const driverId = driverData.id || `DRV${String(fallbackData.drivers.length + 1).padStart(3, '0')}`;
      
      const newDriver = {
        id: driverId,
        name: driverData.name,
        phone: driverData.phone,
        password: driverData.password,
        licenseNumber: driverData.license_number,
        experienceYears: driverData.experience_years || 0,
        status: driverData.status || 'active',
        assignedBuses: driverData.assigned_buses || [],
        createdAt: new Date().toISOString()
      };
      
      fallbackData.drivers.push(newDriver);
      return newDriver;
    }
    
    const { id, name, phone, password, license_number, experience_years, status = 'active', assigned_buses = [] } = driverData;
    const result = await this.query(
      `INSERT INTO drivers (id, name, phone, password, license_number, experience_years, status, assigned_buses, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [id, name, phone, password, license_number, experience_years, status, JSON.stringify(assigned_buses)]
    );
    
    // Map database fields back to camelCase
    const driver = result.rows[0];
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      password: driver.password,
      licenseNumber: driver.license_number,
      experienceYears: driver.experience_years,
      status: driver.status,
      assignedBuses: driver.assigned_buses || [],
      createdAt: driver.created_at,
      updatedAt: driver.updated_at
    };
  }

  async updateDriver(id, updates) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for updateDriver');
      
      const index = fallbackData.drivers.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          // Map snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          fallbackData.drivers[index][camelKey] = updates[key];
        }
      });
      
      return fallbackData.drivers[index];
    }
    
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE drivers SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteDriver(id) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback mode for deleteDriver');
      
      const index = fallbackData.drivers.findIndex(d => d.id === id);
      if (index === -1) return null;
      
      fallbackData.drivers[index].status = 'deleted';
      return { success: true };
    }
    
    await this.query('UPDATE drivers SET status = $1 WHERE id = $2', ['deleted', id]);
    return { success: true };
  }

  // ============ ADMINS ============
  
  async getAdmins() {
    if (this.fallbackMode) {
      console.log('📦 Using fallback data for admins');
      return fallbackData.admins.filter(a => a.status === 'active');
    }
    
    const result = await this.query('SELECT * FROM admins WHERE status = $1 ORDER BY created_at DESC', ['active']);
    return result.rows;
  }

  async getAdminById(id) {
    const result = await this.query('SELECT * FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getAdminByUsername(username) {
    if (this.fallbackMode) {
      await this.initializeFallbackData();
      console.log('📦 Using fallback data for admin authentication');
      const admin = fallbackData.admins.find(a => a.username === username);
      return admin || null;
    }
    
    const result = await this.query('SELECT * FROM admins WHERE username = $1', [username]);
    return result.rows[0];
  }

  async addAdmin(adminData) {
    const { id, username, password, name, email, role = 'admin', status = 'active' } = adminData;
    const result = await this.query(
      `INSERT INTO admins (id, username, password, name, email, role, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [id, username, password, name, email, role, status]
    );
    return result.rows[0];
  }

  async updateAdmin(id, updates) {
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await this.query(
      `UPDATE admins SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // ============ UTILITY METHODS ============
  
  async getLocations() {
    // Get unique locations from routes
    const result = await this.query(`
      SELECT DISTINCT location_name, lat, lon FROM (
        SELECT start_point as location_name, start_lat as lat, start_lon as lon FROM routes WHERE status = 'active'
        UNION
        SELECT end_point as location_name, end_lat as lat, end_lon as lon FROM routes WHERE status = 'active'
        UNION
        SELECT stop->>'name' as location_name, (stop->>'lat')::decimal as lat, (stop->>'lon')::decimal as lon 
        FROM routes, jsonb_array_elements(stops) as stop WHERE status = 'active'
      ) locations
      WHERE location_name IS NOT NULL
      ORDER BY location_name
    `);
    
    return result.rows.map(row => ({
      name: row.location_name,
      lat: parseFloat(row.lat),
      lon: parseFloat(row.lon)
    }));
  }

  // Close connection pool
  async close() {
    await this.pool.end();
  }
}

module.exports = new DatabaseService();