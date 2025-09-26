import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from '../lib/db';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Sale ID is required' });
  }

  if (req.method === 'DELETE') {
    try {
      // The ON DELETE CASCADE on sale_products will handle deleting related items
      const result = await query('DELETE FROM sales WHERE id = $1', [id]);
      
      if (result.length > 0) { // Neon/Vercel pg might return an empty array on success
        return res.status(200).json({ message: 'Sale deleted successfully.' });
      } else {
         // Check if it existed
         const check = await query('SELECT 1 FROM sales WHERE id = $1', [id]);
         if (check.length === 0) {
            return res.status(404).json({ error: 'Sale not found.' });
         }
         return res.status(200).json({ message: 'Sale deleted successfully.' });
      }

    } catch (error: any) {
      console.error(`Failed to delete sale ${id}:`, error);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }
  } else {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default withDbConnection(handler as any);