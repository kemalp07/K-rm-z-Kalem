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
  // Top-down sheet (source/sheet-topdown-detailed.jpg): the flame burns where the wick is.
  lamp: { size: [279, 283], anchor: [139, 141], width: 133, points: { flame: [139, 141] } },
  candle: { size: [281, 326], anchor: [140, 185], width: 66.5, points: { flame: [142, 196] } },
  // source/sheet-pen-magnifier.jpg
  pen: { size: [82, 906], anchor: [39.5, 896], width: 15.5 },
  // Glass radius in the image is ~154 px; drawn so it matches the game's LENS_R (38).
  magnifier: { size: [532, 735], anchor: [184, 186], width: 131, points: { handleEnd: [507, 718] } },
  stamp: { size: [213, 215], anchor: [106, 107], width: 57 },
};
