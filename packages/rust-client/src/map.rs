pub enum Tile {
    EMPTY,
    BLOCKED,
}

pub enum MapStructure {
    SquareMap(Vec<Vec<Tile>>),
}

impl MapStructure {
    pub fn get_map(&self) -> &Vec<Vec<Tile>> {
        match self {
            Self::SquareMap(vec) => {
                return vec;
            }
        }
    }
}

pub struct Map {
    tiles: MapStructure,
    height: usize,
    width: usize,
}

impl Map {
    pub fn new(structure: MapStructure) -> Result<Self, &'static str> {
        let tiles = structure.get_map();
        let height = tiles.len();
        if height == 0 {
            return Err("Cannot create a map with no tiles.");
        }
        let width = tiles.get(0).unwrap().len();
        for i in 1..tiles.len() {
            if tiles.get(i).unwrap().len() != height {
                return Err("All rows in the map must be the same length");
            }
        }
        return Ok(Self {
            tiles: structure,
            height: height,
            width: width,
        });
    }
    pub fn get_width(&self) -> usize {
        return self.width;
    }
    pub fn get_height(&self) -> usize {
        return self.height;
    }
}
