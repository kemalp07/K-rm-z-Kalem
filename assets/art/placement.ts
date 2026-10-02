// How each illustration sits on the desk. Hand-measured from the files in this folder
// (pixel coordinates in the image), so swapping art means updating the numbers here.
//
//   size    the image's pixel size, as delivered
//   anchor  the pixel that lands on the object's origin in the game
//           (lamp: middle of its foot; candle: middle of the saucer under the stick;
//            pen: the point; magnifier: centre of the glass; stamp: middle of its base)
//   width   how wide the image is drawn, in board units
//   points  other pixels the game needs (where the flame burns, where the handle ends)

export interface ArtPlacement {
  size: [number, number];
  anchor: [number, number];
  width: number;
  points?: Record<string, [number, number]>;
}

export const artPlacement: Record<string, ArtPlacement> = {
  lamp: { size: [175, 436], anchor: [87, 426], width: 92, points: { flame: [87, 226] } },
  candle: { size: [196, 213], anchor: [82, 172], width: 76, points: { flame: [81.5, 11] } },
  pen: { size: [44, 289], anchor: [21.5, 279], width: 27.4 },
  // Glass radius in the image is ~49 px; drawn so it matches the game's LENS_R (38).
  magnifier: { size: [241, 295], anchor: [78, 72], width: 187, points: { handleEnd: [224, 284] } },
  stamp: { size: [146, 169], anchor: [73, 150], width: 54 },
};
