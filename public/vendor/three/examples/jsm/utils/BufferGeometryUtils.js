import {
	BufferAttribute,
	TrianglesDrawMode,
	TriangleFanDrawMode,
	TriangleStripDrawMode
} from 'three';

function toTrianglesDrawMode( geometry, drawMode ) {

	if ( drawMode === TrianglesDrawMode ) {

		console.warn( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.' );
		return geometry;

	}

	if ( drawMode !== TriangleFanDrawMode && drawMode !== TriangleStripDrawMode ) {

		console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:', drawMode );
		return geometry;

	}

	const index = geometry.getIndex();

	if ( index === null ) {

		console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined index. Generate a index buffer before converting to triangles.' );
		return geometry;

	}

	const numberOfTriangles = index.count - 2;
	const newIndices = [];

	if ( drawMode === TriangleFanDrawMode ) {

		for ( let i = 1; i <= numberOfTriangles; i ++ ) {

			newIndices.push( index.getX( 0 ) );
			newIndices.push( index.getX( i ) );
			newIndices.push( index.getX( i + 1 ) );

		}

	} else {

		for ( let i = 0; i < numberOfTriangles; i ++ ) {

			if ( i % 2 === 0 ) {

				newIndices.push( index.getX( i ) );
				newIndices.push( index.getX( i + 1 ) );
				newIndices.push( index.getX( i + 2 ) );

			} else {

				newIndices.push( index.getX( i + 2 ) );
				newIndices.push( index.getX( i + 1 ) );
				newIndices.push( index.getX( i ) );

			}

		}

	}

	if ( ( newIndices.length / 3 ) !== numberOfTriangles ) {

		console.error( 'THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

	}

	const newGeometry = geometry.clone();
	newGeometry.setIndex( new BufferAttribute( new Uint32Array( newIndices ), 1 ) );
	newGeometry.clearGroups();

	return newGeometry;

}

export { toTrianglesDrawMode };
