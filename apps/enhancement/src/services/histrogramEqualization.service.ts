import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { convertToGreyscale } from '../../../common/utils/greyscale';

@Injectable()
export class HistogramEqualizationService {
  @MessagePattern({ cmd: 'histogram_equalization' })
  async equalizeHistogram(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
      const outputFileName = 'histogram_equalized.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { buffer: raw, width, height } = await convertToGreyscale(imagePath);

      const histogram = Array(256).fill(0);
      raw.forEach(pixel => histogram[pixel]++);
      const cdf = histogram.reduce((acc, val, i) => [...acc, acc[i - 1] + val || val], []);
      const cdfMin = cdf.find(val => val > 0);
      const totalPixels = raw.length;

      const equalized = Buffer.alloc(raw.length);

      for (let i = 0; i < raw.length; i++) {
        const originalIntensity = raw[i];
        const newIntensity = Math.round(((cdf[originalIntensity] - cdfMin) / (totalPixels - cdfMin)) * 255);
        equalized[i] = newIntensity;
      }

      await sharp(equalized, {
        raw: {
          width: width!,
          height: height!,
          channels: 1,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Histogram equalization complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
