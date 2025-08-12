import { describe, expect, test } from '@jest/globals';
import { generateMap } from '../app/lib/generation/map_generation';
import { MapConfiguration, TileType } from '../../../packages/types/game_types';

describe('Map Generation', () => {
    test('should generate a map with the correct dimensions', () => {
        const config = {
            width: 100,
            height: 100,
            seed: 99999999999999
        };
        const map = generateMap(config);
        expect(map.width).toBe(config.width);
        expect(map.height).toBe(config.height);
    });

    test('should generate a map with walkable tiles', () => {
        const config = {
            width: 10,
            height: 10,
            seed: 9999999999999
        };
        const map = generateMap(config);
        const walkableTiles = map.tiles.flat().filter(tile => tile.type === TileType.EMPTY);
        expect(walkableTiles.length).toBeGreaterThan(0);
    });

    test('maps generated with a specific configuration are always identical', () => {
        const config: MapConfiguration = {
            width: 100,
            height: 100,
            seed: 99999999999999
        };
        const map1 = generateMap(config);
        const map2 = generateMap(config);
        expect(map1).toEqual(map2);
    });
});
