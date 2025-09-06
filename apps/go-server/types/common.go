package types

import (
	"encoding/binary"
)

type Vector2[T any] struct {
	X T
	Y T
}

// u32 length; string;
func EncodeString(s string) []byte {
	encoded := []byte(s)
	result := []byte{}
	result = binary.BigEndian.AppendUint32(result, uint32(len(encoded)))
	result = append(result, encoded...)

	return result
}

// u32 length; string;
// Returns: string; total bytes traversed
func DecodeString(p []byte) (string, uint32) {
	length := binary.BigEndian.Uint32(p[0:4])
	return string(p[4 : length+4]), (length + 4)
}
