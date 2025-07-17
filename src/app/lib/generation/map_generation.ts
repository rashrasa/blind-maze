import { MapLayout, MapConfiguration, TileType } from '../types/game_types';
import { generate2DMazeLayout } from '../../../../libraries/random';

function generateMap(config: MapConfiguration): MapLayout {
    return {
        tiles: generate2DMazeLayout(config.width, config.height, config.seed).map(
            row => row.map(
                blocked => blocked ? TileType.WALL : TileType.EMPTY
            )
        ),
        width: config.width,
        height: config.height
    }
}

function generateGenericLayout(config: MapConfiguration): MapLayout {
    let width = config.width;
    let height = config.height;
    let seed = config.seed;

    let tiles: TileType[][] = [];
    // TODO: Implement world generation

    for (let i = 0; i < height; i++) {
        let row: TileType[] = []
        for (let j = 0; j < width; j++) {
            if (i == 0 || i == height - 1 || j == 0 || j == width - 1 || i == j) {
                row.push(1)
            }
            else {
                row.push(0)
            }
        }
        tiles.push(row)
    }
    return {
        width: tiles.length,
        height: tiles[0]?.length || 0,
        tiles: tiles
    }
}

export { generateMap };