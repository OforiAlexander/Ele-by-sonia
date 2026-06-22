import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import Product from '../../../models/Product';
import * as ImagesService from './images.service';

export async function uploadImagesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const product = await Product.query().findById(req.params.id);
        if (!product) { res.status(404).json({ code: CODES.NOT_FOUND }); return; }

        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
            res.status(422).json({ code: CODES.VALIDATION_ERROR, errors: [{ msg: 'At least one image is required.' }] });
            return;
        }

        const data = await ImagesService.addImages(req.params.id, files);
        res.status(201).json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function deleteImageController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await ImagesService.removeImage(req.params.id, req.params.imageId);
        res.json({ code: CODES.OK });
    } catch (err) { next(err); }
}
