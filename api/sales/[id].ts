import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Sale ID is required' });
  }

  if (req.method === 'DELETE') {
    try {
      // Execute the delete operation. If the ID doesn't exist, this
      // command will still succeed without error, which is acceptable
      // for a DELETE request. The ON DELETE CASCADE directive in the
      // 'sale_products' table will handle deleting related items.
      await query('DELETE FROM sales WHERE id = $1', [id]);
      
      // If the query completes without throwing an error, we can consider it successful.
      return res.status(200).json({ message: 'Sale deleted successfully.' });

    } catch (error: any) {
      console.error(`Failed to delete sale ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  } else {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withDbConnection(handler as any);
