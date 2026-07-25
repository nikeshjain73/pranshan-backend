const { sendResponse } = require('../../../helper/response');
const Grid = require('../../../models/erp/planner/draw_grid.model');

exports.manageGrid = async (req, res) => {
    const { id, drawing_id, grid_no, grid_qty } = req.body;
    if (!req.user || req.error) {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }

    if (!drawing_id || !grid_no || !grid_qty) {
        sendResponse(res, 400, false, {}, 'Missing parameter');
        return;
    }
    try {
        if (id) {
            const updatedGrid = await Grid.findByIdAndUpdate(
                id,
                { drawing_id, grid_no, grid_qty },
                { new: true, runValidators: true }
            );

            if (!updatedGrid) {
                sendResponse(res, 404, false, {}, 'Grid not found');
            }

            sendResponse(res, 200, true, updatedGrid, 'Grid updated successfully');
        }
        else {
            const existGrid = await Grid.find({
                drawing_id,
                grid_no: grid_no.trim(),
                grid_qty
            });

            if (existGrid?.length > 0) {
                sendResponse(res, 200, true, existGrid[0], 'Grid already exists');
                return;
            }
            const newGrid = new Grid({
                drawing_id,
                grid_no,
                grid_qty,
            });

            const savedGrid = await newGrid.save();
            sendResponse(res, 200, true, savedGrid, 'Grid created successfully');

        }
    } catch (error) {
        sendResponse(res, 500, false, {}, 'Something went wrong');
    }
};

exports.getAllGrids = async (req, res) => {
    const { drawing_id } = req.body;
    try {
        const filter = { deleted: false };
        if (drawing_id) {
            filter.drawing_id = drawing_id;
        }

        const grids = await Grid.find(filter, { deleted: 0, createdAt: 0, updatedAt: 0 })
            .populate('drawing_id', 'drawing_no draw_receive_date rev sheet_no assembly_no ')
            .sort({ createdAt: -1 });

        sendResponse(res, 200, true, grids, 'Grids retrieved successfully');
    } catch (error) {
        sendResponse(res, 500, false, {}, 'Something went wrong');
    }
};

exports.deleteGrid = async (req, res) => {
    const { id } = req.body;
    try {

        const deletedGrid = await Grid.findByIdAndUpdate(id, {
            deleted: true,
        });

        if (!deletedGrid) {
            sendResponse(res, 404, false, {}, 'Grid not found');
        }

        sendResponse(res, 200, true, {}, 'Grid deleted successfully');
    } catch (error) {
        sendResponse(res, 500, false, {}, 'Something went wrong');
    }
};

exports.getMultiGridDrawing = async (req, res) => {
    const { drawIds } = req.body;
    if (!req.user || req.error) {
        sendResponse(res, 401, false, {}, 'Unauthorized');
        return;
    }

    const parseIds = JSON.parse(drawIds);

    if (!parseIds.length > 0) {
        sendResponse(res, 400, false, {}, 'Missing parameter');
        return;
    }
    try {
        const filter = {
            deleted: false, drawing_id: { $in: parseIds }
        };

        const grids = await Grid.find(filter, { deleted: 0, createdAt: 0, updatedAt: 0 })
            .populate('drawing_id', 'drawing_no draw_receive_date rev sheet_no assembly_no ')
            .sort({ createdAt: -1 });

        sendResponse(res, 200, true, grids, 'Grids retrieved successfully');
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, false, {}, 'Something went wrong');
    }

}