function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function getRandomType(types) {
  return types[Math.floor(Math.random() * types.length)];
}

function getStartY(type, shapes) {
  let countRowsWithZerosBeforeOne = 0;
  for (const row of shapes[type]) {
    if (row.every(value => value === 0)) {
      countRowsWithZerosBeforeOne++;
    } else {
      break;
    }
  }
  return -countRowsWithZerosBeforeOne;
}

function getRandomShape(types, shapes, cols) {
  const type = getRandomType(types);

  return {
    type,
    matrix: shapes[type].map((row) => [...row]),
    x: Math.floor(cols / 2) - Math.ceil(shapes[type][0].length / 2),
    y: getStartY(type, shapes),
  };
}

function getBomb() {
  return {
    type: "bomb",
    matrix: [[1]],
    x: Math.floor(cols / 2),
    y: 0,
  };
}

function getNextShapePreview(type, shapes) {
  return {
    type,
    matrix: shapes[type].map((row) => [...row]),
    x: 0,
    y: 0,
  };
}