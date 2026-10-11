"""Generate the lightweight ISS map from Natural Earth 1:110m land polygons.

Usage: python scripts/generate-iss-world.py path/to/ne_110m_land.shp
Natural Earth data is public domain: https://www.naturalearthdata.com/
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path


WIDTH = 1280
HEIGHT = 640


def fmt(value: float) -> str:
    rounded = round(value, 2)
    return str(int(rounded)) if rounded.is_integer() else f"{rounded:.2f}".rstrip("0").rstrip(".")


def project(longitude: float, latitude: float) -> tuple[float, float]:
    # Equirectangular (Plate Carrée): same transform used by the ISS marker.
    return ((longitude + 180) / 360 * WIDTH, (90 - latitude) / 180 * HEIGHT)


def rings_from_shapefile(path: Path):
    with path.open("rb") as source:
        source.seek(100)  # 100-byte ESRI Shapefile header
        while record_header := source.read(8):
            if len(record_header) != 8:
                raise ValueError("Truncated shapefile record header")
            _, content_words = struct.unpack(">2i", record_header)
            content = source.read(content_words * 2)
            shape_type = struct.unpack_from("<i", content, 0)[0]
            if shape_type == 0:
                continue
            if shape_type not in (5, 15, 25):
                raise ValueError(f"Expected polygon geometry, got shape type {shape_type}")

            part_count, point_count = struct.unpack_from("<2i", content, 36)
            part_offset = 44
            parts = struct.unpack_from(f"<{part_count}i", content, part_offset)
            points_offset = part_offset + part_count * 4
            points = [
                struct.unpack_from("<2d", content, points_offset + index * 16)
                for index in range(point_count)
            ]
            ends = (*parts[1:], point_count)
            for start, end in zip(parts, ends):
                ring = points[start:end]
                if len(ring) < 3:
                    continue
                yield ring


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/generate-iss-world.py <ne_110m_land.shp>")

    source = Path(sys.argv[1])
    output = Path(__file__).resolve().parents[1] / "public" / "iss-world.svg"
    paths: list[str] = []
    for ring in rings_from_shapefile(source):
        projected = [project(lon, lat) for lon, lat in ring]
        first_x, first_y = projected[0]
        commands = [f"M{fmt(first_x)},{fmt(first_y)}"]
        commands.extend(f"L{fmt(x)},{fmt(y)}" for x, y in projected[1:])
        commands.append("Z")
        paths.append(" ".join(commands))

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" '
        'preserveAspectRatio="none" role="img" aria-label="Natural Earth land polygons">\n'
        '  <!-- Natural Earth 1:110m land, projected Plate Carrée; public domain. -->\n'
        f'  <path fill="#000" fill-rule="evenodd" d="{" ".join(paths)}"/>\n'
        '</svg>\n'
    )
    output.write_text(svg, encoding="utf-8")
    print(f"Wrote {output} ({output.stat().st_size:,} bytes, {len(paths)} rings)")


if __name__ == "__main__":
    main()
