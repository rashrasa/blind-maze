import {MapLayout, MapConfiguration, Tile} from '../types/game_types';

function generateMap(config: MapConfiguration): MapLayout {
    let width = config.width;
    let height = config.height;
    let seed = config.seed;
    
    let tiles: Tile[][] = [];
    // TODO: Implement world generation

    return {
        width: tiles.length,
        height: tiles[0]?.length || 0,
        tiles: tiles
    }
}

export {generateMap};