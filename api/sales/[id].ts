import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from './lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Explicitly handle the browser's CORS preflight OPTIONS request.
  // This is the definitive fix for the "405 Method Not Allowed" error.
  // The vercel.json configuration should handle this, but this makes the function robust
  // in case the OPTIONS request is passed through.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Sale ID is required' });
    }

    try {
      // The ON DELETE CASCADE directive in the 'sale_products' table will handle deleting related items.
      await query('DELETE FROM sales WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (error: any) {
      console.error(`Failed to delete sale ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  }

  // If the method is not handled above, it is not allowed.
  res.setHeader('Allow', ['DELETE', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

export default withDbConnection(handler as any);