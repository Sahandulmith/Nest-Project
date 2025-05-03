/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResizeService {
  @MessagePattern({ cmd: 'resize_image' })
  async resize(data: { imagePath: string; width: number; height: number }) {
    try {
      const { imagePath, width, height } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = 'resized_image.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputImage = await fs.promises.readFile(imagePath);
      const { data: inputBuffer, info: inputInfo } = await sharp(inputImage).raw().toBuffer({ resolveWithObject: true });

      const resizedBuffer = this.bilinearInterpolation(inputBuffer, inputInfo.height,  inputInfo.width, height, width);

      // Save the resized image
      await sharp(resizedBuffer, {
        raw: {
          width: width,
          height: height,
          channels: inputInfo.channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image resized successfully',
        savedImagePath: outputFilePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private bilinearInterpolation(
    inputBuffer: Buffer,
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number
  ): Buffer {
    const outputBuffer = Buffer.alloc(outputWidth * outputHeight * 3);

    return outputBuffer;
  }
}

export function resizeImage(image: number[][][], newWidth: number, newHeight: number): number[][][] {
  const [oldHeight, oldWidth] = [image.length, image[0].length];
  const resizedImage = Array.from({ length: newHeight }, () => Array(newWidth).fill([0, 0, 0]));

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = (x / newWidth) * oldWidth;
      const srcY = (y / newHeight) * oldHeight;
      const x1 = Math.floor(srcX), x2 = Math.min(x1 + 1, oldWidth - 1);
      const y1 = Math.floor(srcY), y2 = Math.min(y1 + 1, oldHeight - 1);

      const fQ11 = image[y1][x1], fQ21 = image[y1][x2];
      const fQ12 = image[y2][x1], fQ22 = image[y2][x2];

      const r1 = fQ11.map((c, i) => c + (fQ21[i] - c) * (srcX - x1));
      const r2 = fQ12.map((c, i) => c + (fQ22[i] - c) * (srcX - x1));
      resizedImage[y][x] = r1.map((c, i) => Math.round(c + (r2[i] - c) * (srcY - y1)));
    }
  }
  return resizedImage;
}