import db from '../config/db.js';
import { logActivity } from '../middleware/roleMiddleware.js';

const getCategories = async (req, res, next) => {
    try {
        const categories = await db.Category.findAll({
            include: [
                {
                    model: db.Medicine,
                    as: 'medicines',
                    where: { is_active: true },
                    required: false,
                    attributes: []
                }
            ],
            attributes: {
                include: [
                    [db.sequelize.fn('COUNT', db.sequelize.col('medicines.id')), 'medicine_count']
                ]
            },
            group: ['Category.id'],
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const { name, description, color } = req.body;
        const category = await db.Category.create({
            name,
            description: description || null,
            color: color || '#3B82F6'
        });

        await logActivity(req.user.id, 'create', 'category', category.id, null, req.body, req);
        res.status(201).json({ success: true, message: 'Category added.', data: { id: category.id } });
    } catch (err) {
        next(err);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await db.Category.findByPk(id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

        const { name, description, color } = req.body;
        const oldValues = category.toJSON();

        await category.update({
            name,
            description: description || null,
            color: color || '#3B82F6'
        });

        await logActivity(req.user.id, 'update', 'category', id, oldValues, req.body, req);
        res.json({ success: true, message: 'Category updated.' });
    } catch (err) {
        next(err);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const category = await db.Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });

        const oldValues = category.toJSON();
        await category.destroy();

        await logActivity(req.user.id, 'delete', 'category', req.params.id, oldValues, null, req);
        res.json({ success: true, message: 'Category deleted.' });
    } catch (err) {
        next(err);
    }
};

export { getCategories, createCategory, updateCategory, deleteCategory };
