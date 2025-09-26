import { VercelRequest, VercelResponse } from '@vercel/node';
import { withDbConnection, query } from './lib/db.js';
import { ProdutoInfo } from '../types';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    switch (req.method) {
      case 'POST': // Create
        const newProduct: ProdutoInfo = req.body;
        if (!newProduct || !newProduct.name || newProduct.preco == null || !newProduct.status) {
          return res.status(400).json({ error: 'Invalid product data provided.' });
        }
        const createResult = await query(
            'INSERT INTO products (name, preco, status) VALUES ($1, $2, $3) ON CONFLICT(name) DO NOTHING RETURNING *', 
            [newProduct.name, newProduct.preco, newProduct.status]
        );
        if (createResult.length === 0) {
            return res.status(409).json({ error: 'Product with this name already exists.' });
        }
        return res.status(201).json(createResult[0]);

      case 'PUT': // Update
        const { product, originalName } = req.body;
        if (!product || !originalName) {
            return res.status(400).json({ error: 'Product data and original name are required for update.' });
        }
        const updateResult = await query(
            'UPDATE products SET name = $1, preco = $2, status = $3 WHERE name = $4 RETURNING *',
            [product.name, product.preco, product.status, originalName]
        );
        if (updateResult.length === 0) {
            return res.status(404).json({ error: 'Product to update not found.' });
        }
        return res.status(200).json(updateResult[0]);

      case 'DELETE': // Delete
        const { productName } = req.body;
        if (!productName) {
            return res.status(400).json({ error: 'Product name is required for deletion.' });
        }
        await query('DELETE FROM products WHERE name = $1', [productName]);
        return res.status(200).json({ message: 'Product deleted successfully.' });

      default:
        res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('API /api/products Error:', error);
    if (error.message.includes('violates foreign key constraint')) {
        return res.status(409).json({ error: 'Cannot delete product because it is associated with existing sales.'});
    }
    return res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
  }
};

export default withDbConnection(handler as any);