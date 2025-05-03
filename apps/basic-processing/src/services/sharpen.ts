import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { applyConvolution } from 'apps/common/utils/convolution';

@Injectable()
export class SharpenService {
  // Do not change the this kernel
  private readonly strongKernel = [
    [-1, -1, -1],
    [-1, 9, -1],
    [-1, -1, -1],
  ];

  private applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);
    const offset = 1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          let sum = 0;
          const pixelIndex = (y * width + x) * channels + c;

          for (let ky = -offset; ky <= offset; ky++) {
            for (let kx = -offset; kx <= offset; kx++) {
            }
          }

          result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum)));
        }
      }
    }

    return result;
  }

  @MessagePattern({ cmd: 'sharpen_image' })
  async sharpenImage(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFilePath = path.join(outputDir, 'sharpened_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const imageBuffer = await image.raw().toBuffer();

      const sharpened = this.applyConvolution(imageBuffer, width!, height!, channels);

      await sharp(sharpened, {
        raw: {
          width: width!,
          height: height!,
          channels,
        },
      })
        .png({ compressionLevel: 6 })
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image sharpened without resizing',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Sharpening failed:', error);
      return {
        success: false,
        message: 'Image sharpening failed',
        error: error.message,
      };
    }
  }
}

export function sharpenImage(image: number[][][]): number[][][] {
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ];
  const height = image.length;
  const width = image[0].length;
  const channels = image[0][0].length;
  const buffer = Buffer.alloc(height * width * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        const pixelIndex = (y * width + x) * channels + c;
        buffer[pixelIndex] = image[y][x][c];
      }
    }
  }
  const resultBuffer = applyConvolution(buffer, width, height, channels, kernel);
  const result: number[][][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width; x++) {
      const pixel: number[] = [];
      for (let c = 0; c < channels; c++) {
        const pixelIndex = (y * width + x) * channels + c;
        pixel.push(resultBuffer[pixelIndex]);
      }
      row.push(pixel);
    }
    result.push(row);
  }
  return result;
}