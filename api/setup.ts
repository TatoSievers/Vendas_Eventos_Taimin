import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, name, date } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: 'Type and name are required' });
  }
  
  if (type === 'event' && !date) {
    return res.status(400).json({ error: 'Date is required for events' });
  }

  try {
    if (type === 'user') {
      const result = await query(
        'INSERT INTO users (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
        [name]
      );
      return res.status(201).json({ message: 'User created or already exists.', user: result[0] });
    } else if (type === 'event') {
      const result = await query(
        'INSERT INTO events (name, date) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *',
        [name, date]
      );
      return res.status(201).json({ message: 'Event created or already exists.', event: result[0] });
    } else {
      return res.status(400).json({ error: 'Invalid type specified' });
    }
  } catch (error: any) {
    console.error(`Failed to create ${type}:`, error);
    // Handle potential unique constraint violation gracefully
    if (error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(409).json({ error: `A ${type} with this name already exists.` });
    }
    return res.status(500).json({ error: 'Database insert failed', details: error.message });
  }
};

export default withDbConnection(handler as any);
