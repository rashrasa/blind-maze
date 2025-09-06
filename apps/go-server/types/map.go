package types

import "encoding/binary"

type MapLayout struct {
	Width  uint32
	Height uint32
	Tiles  []byte
}

// ENCODING:
// [
// u32 width;
// u32 height;
// flattened bitArray of map
// ]
func (layout *MapLayout) ToBinary() []byte {
	buffer := []byte{}

	buffer = binary.BigEndian.AppendUint32(buffer, layout.Width)
	buffer = binary.BigEndian.AppendUint32(buffer, layout.Height)

	buffer = append(buffer, layout.Tiles...)

	return buffer
}
