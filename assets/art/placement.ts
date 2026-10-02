// How each illustration sits on the desk. Hand-measured from the files in this folder
// (pixel coordinates in the image), so swapping art means updating the numbers here.
//
//   size    the image's pixel size, as delivered
//   anchor  the pixel that lands on the object's origin in the game
//           (lamp, candle, stamp: centre of the round body seen from above;
//            pen: the point; magnifier: centre of the glass)
//   width   how wide the image is drawn, in board units
//   points  other pixels the game needs (where the flame burns, where the handle ends)

export interface ArtPlacement {
  size: [number, number];
  anchor: [number, number];
  width: number;
  points?: Record<string, [number, number]>;
}

export const artPlacement: Record<string, ArtPlacement> = {
  // Top-down sheet (source/sheet-topdown.jpg): the flame burns where the wick is.
  lamp: { size: [269, 270], anchor: [134, 135], width: 133, points: { flame: [134, 135] } },
  candle: { size: [260, 325], anchor: [129, 130], width: 67, points: { flame: [127, 128] } },
  pen: { size: [44, 289], anchor: [21.5, 279], width: 27.4 },
  // Glass radius in the image is ~49 px; drawn so it matches the game's LENS_R (38).
  magnifier: { size: [241, 295], anchor: [78, 72], width: 187, points: { handleEnd: [224, 284] } },
  stamp: { size: [189, 191], anchor: [94, 94], width: 58 },
};
