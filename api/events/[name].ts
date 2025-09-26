import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Handle preflight OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method === 'DELETE') {
    const { name } = req.query;

    if (typeof name !== 'string' || !name) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    const eventName = decodeURIComponent(name);

    try {
      // ON DELETE CASCADE on the 'sales' table's event_id foreign key
      // will automatically delete all associated sales.
      await query('DELETE FROM events WHERE name = $1', [eventName]);
      
      return res.status(200).json({ message: `Event '${eventName}' and all its sales have been deleted.` });

    } catch (error: any) {
      console.error(`Failed to delete event ${eventName}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  }

  // If the method is not handled above, it is not allowed.
  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

export default withDbConnection(handler as any);