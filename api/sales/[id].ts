// api/sales/[id].ts

import { VercelRequest, VercelResponse } from '@vercel/node';
// Fix: Corrected import path to resolve to the 'db.js' module within the 'api/lib' directory.
import { withDbConnection, query } from '../lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Handle CORS preflight requests from the browser.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle the deletion of a specific sale record.
  if (req.method === 'DELETE') {
    const { id } = req.query;

    // Validate that the ID was provided in the URL.
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'Sale ID is required and must be a string.' });
    }

    try {
      // Execute the delete operation against the database.
      await query('DELETE FROM sales WHERE id = $1', [id]);
      
      // Respond with success.
      return res.status(200).json({ message: 'Sale deleted successfully.' });

    } catch (error: any) {
      console.error(`Failed to delete sale with ID ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  }

  // If the method is not DELETE or OPTIONS, it's not allowed.
  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

// Wrap the handler with the database connection logic.
export default withDbConnection(handler as any);