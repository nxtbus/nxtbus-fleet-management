#!/usr/bin/env python3
import re

# Read the file
with open('server/services/databaseService.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the updateBus method
old_pattern = r'  async updateBus\(id, updates\) \{[\s\S]*?return result\.rows\[0\];\s+\}'

new_code = '''  async updateBus(id, updates) {
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
  }'''

# Replace
content = re.sub(old_pattern, new_code, content, count=1)

# Find and replace the deleteBus method
old_delete_pattern = r'  async deleteBus\(id\) \{[\s\S]*?return \{ success: true \};\s+\}'

new_delete_code = '''  async deleteBus(id) {
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
  }'''

# Replace
content = re.sub(old_delete_pattern, new_delete_code, content, count=1)

# Write back
with open('server/services/databaseService.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated updateBus and deleteBus methods!")
