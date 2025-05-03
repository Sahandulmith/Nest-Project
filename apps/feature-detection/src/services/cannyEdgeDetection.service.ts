import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { MessagePattern } from '@nestjs/microservices';
import { convertToGreyscale } from '../../../common/utils/greyscale';
import { applyGaussianBlur } from './gaussianBlur';
import { computeSobelGradients } from './sobelGradients';
import { nonMaxSuppression } from './nonMaxSuppression';
import { doubleThreshold } from './doubleThreshold';
import { hysteresis } from './hysteresis';


@Injectable()
export class CannyEdgeDetectionService {
  @MessagePattern({ cmd: 'canny_edge_detection' })
  async detectEdges(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) throw new Error('File does not exist');

      const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
      const outputFileName = 'canny_edges.png';
      const outputFilePath = path.join(outputDir, outputFileName);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // Convert to greyscale
      const { buffer: gray, width, height } = await convertToGreyscale(imagePath);

      // Calculate gradients
      const { magnitude, direction } = computeSobelGradients(gray, width!, height!);

      // Non-Max Suppression
      const thinEdges = nonMaxSuppression(magnitude, direction, width!, height!);

      // Double Threshold
      const { strongEdges, weakEdges } = doubleThreshold(thinEdges, width!, height!, 5, 25);

      // Save the final output
      await sharp(strongEdges, {
        raw: { width: width!, height: height!, channels: 1 },
      }).png().toFile(outputFilePath);

      return {
        success: true,
        message: 'Canny edge detection complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export function cannyEdgeDetection(image: number[][][]): number[][][] {
  const gradients = calculateGradients(image); // Sobel operator
  const suppressed = nonMaxSuppression(gradients.magnitude, gradients.direction, gradients.width, gradients.height);
  return hysteresisThresholding(suppressed, 50, 150); // Threshold values
}
function hysteresisThresholding(suppressed: Float32Array<ArrayBufferLike>, arg1: number, arg2: number): number[][][] {
  throw new Error('Function not implemented.');
}

function calculateGradients(image: number[][][]) {
  // Example implementation of Sobel operator to calculate gradients
  const width = image[0].length;
  const height = image.length;
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  // Perform gradient calculations (this is a placeholder logic)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx = -image[y - 1][x - 1][0] + image[y - 1][x + 1][0]
               - 2 * image[y][x - 1][0] + 2 * image[y][x + 1][0]
               - image[y + 1][x - 1][0] + image[y + 1][x + 1][0];
      const gy = -image[y - 1][x - 1][0] - 2 * image[y - 1][x][0] - image[y - 1][x + 1][0]
               + image[y + 1][x - 1][0] + 2 * image[y + 1][x][0] + image[y + 1][x + 1][0];

      const index = y * width + x;
      magnitude[index] = Math.sqrt(gx * gx + gy * gy);
      direction[index] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction, width, height };
}

