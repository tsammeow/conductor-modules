import { mat4, vec3 } from 'gl-matrix';
import {
  functionDeclaration,
  variableDeclaration,
} from '../../typings/type_map';
import {
  Rune,
  DrawnRune,
  drawRunesToFrameBuffer,
  type AnimatedRune
} from './rune';
import {
  getSquare,
  getBlank,
  getRcross,
  getSail,
  getTriangle,
  getCorner,
  getNova,
  getCircle,
  getHeart,
  getPentagram,
  getRibbon,
  throwIfNotRune,
  addColorFromHex,
  colorPalette,
  hexToColor
} from './runes_ops';
import {
  type FrameBufferWithTexture,
  getWebGlFromCanvas,
  initFramebufferObject,
  initShaderProgram
} from './runes_webgl';

export type RuneModuleState = {
  drawnRunes: (AnimatedRune | DrawnRune)[]
};

// =============================================================================
// Basic Runes
// =============================================================================

class RuneFunctions {
  /**
   * Rune with the shape of a full square
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static square: Rune = getSquare();
  /**
   * Rune with the shape of a blank square
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static blank: Rune = getBlank();
  /**
   * Rune with the shape of a
   * small square inside a large square,
   * each diagonally split into a
   * black and white half
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static rcross: Rune = getRcross();
  /**
   * Rune with the shape of a sail
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static sail: Rune = getSail();
  /**
   * Rune with the shape of a triangle
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static triangle: Rune = getTriangle();
  /**
   * Rune with black triangle,
   * filling upper right corner
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static corner: Rune = getCorner();
  /**
   * Rune with the shape of two overlapping
   * triangles, residing in the upper half
   * of the shape
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static nova: Rune = getNova();
  /**
   * Rune with the shape of a circle
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static circle: Rune = getCircle();
  /**
   * Rune with the shape of a heart
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static heart: Rune = getHeart();
  /**
   * Rune with the shape of a pentagram
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static pentagram: Rune = getPentagram();
  /**
   * Rune with the shape of a ribbon
   * winding outwards in an anticlockwise spiral
   *
   * @category Primitive
   */
  @variableDeclaration('Rune')
  static ribbon: Rune = getRibbon();

  // =============================================================================
  // Textured Runes
  // =============================================================================
  /**
   * Create a rune using the image provided in the url
   * @param {string} imageUrl URL to the image that is used to create the rune.
   * Note that the url must be from a domain that allows CORS.
   * @returns {Rune} Rune created using the image.
   *
   * @category Main
   */
  @functionDeclaration('imageUrl: string', 'Rune')
  static from_url(imageUrl: string): Rune {
    const rune = getSquare();
    rune.texture = new Image();
    rune.texture.crossOrigin = 'anonymous';
    rune.texture.src = imageUrl;
    return rune;
  }

  // =============================================================================
  // XY-axis Transformation functions
  // =============================================================================

  /**
   * Scales a given Rune by separate factors in x and y direction
   * @param {number} ratio_x - Scaling factor in x direction
   * @param {number} ratio_y - Scaling factor in y direction
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting scaled Rune
   *
   * @category Main
   */
  @functionDeclaration('ratio_x: number, ratio_y: number, rune: Rune', 'Rune')
  static scale_independent(
    ratio_x: number,
    ratio_y: number,
    rune: Rune
  ): Rune {
    throwIfNotRune(RuneFunctions.scale_independent.name, rune);
    const scaleVec = vec3.fromValues(ratio_x, ratio_y, 1);
    const scaleMat = mat4.create();
    mat4.scale(scaleMat, scaleMat, scaleVec);

    const wrapperMat = mat4.create();
    mat4.multiply(wrapperMat, scaleMat, wrapperMat);
    return Rune.of({
      subRunes: [rune],
      transformMatrix: wrapperMat
    });
  }

  /**
   * Scales a given Rune by a given factor in both x and y direction
   * @param {number} ratio - Scaling factor
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting scaled Rune
   *
   * @category Main
   */
  @functionDeclaration('ratio: number, rune: Rune', 'Rune')
  static scale(ratio: number, rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.scale.name, rune);
    return RuneFunctions.scale_independent(ratio, ratio, rune);
  }

  /**
   * Translates a given Rune by given values in x and y direction
   * @param {number} x - Translation in x direction
   * @param {number} y - Translation in y direction
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting translated Rune
   *
   * @category Main
   */
  @functionDeclaration('x: number, y: number, rune: Rune', 'Rune')
  static translate(x: number, y: number, rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.translate.name, rune);
    const translateVec = vec3.fromValues(x, -y, 0);
    const translateMat = mat4.create();
    mat4.translate(translateMat, translateMat, translateVec);

    const wrapperMat = mat4.create();
    mat4.multiply(wrapperMat, translateMat, wrapperMat);
    return Rune.of({
      subRunes: [rune],
      transformMatrix: wrapperMat
    });
  }

  /**
   * Rotates a given Rune by a given angle,
   * given in radians, in anti-clockwise direction.
   * Note that parts of the Rune
   * may be cropped as a result.
   * @param {number} rad - Angle in radians
   * @param {Rune} rune - Given Rune
   * @return {Rune} Rotated Rune
   *
   * @category Main
   */
  @functionDeclaration('rad: number, rune: Rune', 'Rune')
  static rotate(rad: number, rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.rotate.name, rune);
    const rotateMat = mat4.create();
    mat4.rotateZ(rotateMat, rotateMat, rad);

    const wrapperMat = mat4.create();
    mat4.multiply(wrapperMat, rotateMat, wrapperMat);
    return Rune.of({
      subRunes: [rune],
      transformMatrix: wrapperMat
    });
  }

  /**
   * Makes a new Rune from two given Runes by
   * placing the first on top of the second
   * such that the first one occupies frac
   * portion of the height of the result and
   * the second the rest
   * @param {number} frac - Fraction between 0 and 1 (inclusive)
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('frac: number, rune1: Rune, rune2: Rune', 'Rune')
  static stack_frac(frac: number, rune1: Rune, rune2: Rune): Rune {
    throwIfNotRune(RuneFunctions.stack_frac.name, rune1);
    throwIfNotRune(RuneFunctions.stack_frac.name, rune2);

    if (!(frac >= 0 && frac <= 1)) {
      throw Error('stack_frac can only take fraction in [0,1].');
    }

    const upper = RuneFunctions.translate(0, -(1 - frac), RuneFunctions.scale_independent(1, frac, rune1));
    const lower = RuneFunctions.translate(0, frac, RuneFunctions.scale_independent(1, 1 - frac, rune2));
    return Rune.of({
      subRunes: [upper, lower]
    });
  }

  /**
   * Makes a new Rune from two given Runes by
   * placing the first on top of the second, each
   * occupying equal parts of the height of the
   * result
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune1: Rune, rune2: Rune', 'Rune')
  static stack(rune1: Rune, rune2: Rune): Rune {
    throwIfNotRune(RuneFunctions.stack.name, rune1, rune2);
    return RuneFunctions.stack_frac(1 / 2, rune1, rune2);
  }

  /**
   * Makes a new Rune from a given Rune
   * by vertically stacking n copies of it
   * @param {number} n - Positive integer
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('n: number, rune: Rune', 'Rune')
  static stackn(n: number, rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.stackn.name, rune);
    if (n === 1) {
      return rune;
    }
    return RuneFunctions.stack_frac(1 / n, rune, RuneFunctions.stackn(n - 1, rune));
  }

  /**
   * Makes a new Rune from a given Rune
   * by turning it a quarter-turn around the centre in
   * clockwise direction.
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static quarter_turn_right(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.quarter_turn_right.name, rune);
    return RuneFunctions.rotate(-Math.PI / 2, rune);
  }

  /**
   * Makes a new Rune from a given Rune
   * by turning it a quarter-turn in
   * anti-clockwise direction.
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static quarter_turn_left(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.quarter_turn_left.name, rune);
    return RuneFunctions.rotate(Math.PI / 2, rune);
  }

  /**
   * Makes a new Rune from a given Rune
   * by turning it upside-down
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static turn_upside_down(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.turn_upside_down.name, rune);
    return RuneFunctions.rotate(Math.PI, rune);
  }

  /**
   * Makes a new Rune from two given Runes by
   * placing the first on the left of the second
   * such that the first one occupies frac
   * portion of the width of the result and
   * the second the rest
   * @param {number} frac - Fraction between 0 and 1 (inclusive)
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('frac: number, rune1: Rune, rune2: Rune', 'Rune')
  static beside_frac(frac: number, rune1: Rune, rune2: Rune): Rune {
    throwIfNotRune(RuneFunctions.beside_frac.name, rune1, rune2);

    if (!(frac >= 0 && frac <= 1)) {
      throw Error('beside_frac can only take fraction in [0,1].');
    }

    const left = RuneFunctions.translate(-(1 - frac), 0, RuneFunctions.scale_independent(frac, 1, rune1));
    const right = RuneFunctions.translate(frac, 0, RuneFunctions.scale_independent(1 - frac, 1, rune2));
    return Rune.of({
      subRunes: [left, right]
    });
  }

  /**
   * Makes a new Rune from two given Runes by
   * placing the first on the left of the second,
   * both occupying equal portions of the width
   * of the result
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune1: Rune, rune2: Rune', 'Rune')
  static beside(rune1: Rune, rune2: Rune): Rune {
    throwIfNotRune(RuneFunctions.beside.name, rune1, rune2);
    return RuneFunctions.beside_frac(1 / 2, rune1, rune2);
  }

  /**
   * Makes a new Rune from a given Rune by
   * flipping it around a horizontal axis,
   * turning it upside down
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static flip_vert(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.flip_vert.name, rune);
    return RuneFunctions.scale_independent(1, -1, rune);
  }

  /**
   * Makes a new Rune from a given Rune by
   * flipping it around a vertical axis,
   * creating a mirror image
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static flip_horiz(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.flip_horiz.name, rune);
    return RuneFunctions.scale_independent(-1, 1, rune);
  }

  /**
   * Makes a new Rune from a given Rune by
   * arranging into a square for copies of the
   * given Rune in different orientations
   * @param {Rune} rune - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static make_cross(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.make_cross.name, rune);
    return RuneFunctions.stack(
      RuneFunctions.beside(RuneFunctions.quarter_turn_right(rune), RuneFunctions.rotate(Math.PI, rune)),
      RuneFunctions.beside(rune, RuneFunctions.rotate(Math.PI / 2, rune))
    );
  }

  /**
   * Applies a given function n times to an initial value
   * @param {number} n - A non-negative integer
   * @param {function} pattern - Unary function from Rune to Rune
   * @param {Rune} initial - The initial Rune
   * @return {Rune} - Result of n times application of pattern to initial:
   * pattern(pattern(...pattern(pattern(initial))...))
   *
   * @category Main
   */
  @functionDeclaration('n: number, pattern: (a: Rune) => Rune, initial: Rune', 'Rune')
  static repeat_pattern(
    n: number,
    pattern: (a: Rune) => Rune,
    initial: Rune
  ): Rune {
    if (n === 0) {
      return initial;
    }
    return pattern(RuneFunctions.repeat_pattern(n - 1, pattern, initial));
  }

  // =============================================================================
  // Z-axis Transformation functions
  // =============================================================================

  /**
   * The depth range of the z-axis of a rune is [0,-1], this function gives a [0, -frac] of the depth range to rune1 and the rest to rune2.
   * @param {number} frac - Fraction between 0 and 1 (inclusive)
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Rune
   *
   * @category Main
   */
  @functionDeclaration('frac: number, rune1: Rune, rune2: Rune', 'Rune')
  static overlay_frac(frac: number, rune1: Rune, rune2: Rune): Rune {
    // to developer: please read https://www.tutorialspoint.com/webgl/webgl_basics.htm to understand the webgl z-axis interpretation.
    // The key point is that positive z is closer to the screen. Hence, the image at the back should have smaller z value. Primitive runes have z = 0.
    throwIfNotRune(RuneFunctions.overlay_frac.name, rune1);
    throwIfNotRune(RuneFunctions.overlay_frac.name, rune2);
    if (!(frac >= 0 && frac <= 1)) {
      throw Error('overlay_frac can only take fraction in [0,1].');
    }
    // by definition, when frac == 0 or 1, the back rune will overlap with the front rune.
    // however, this would cause graphical glitch because overlapping is physically impossible
    // we hack this problem by clipping the frac input from [0,1] to [1E-6, 1-1E-6]
    // this should not be graphically noticable
    let useFrac = frac;
    const minFrac = 0.000001;
    const maxFrac = 1 - minFrac;
    if (useFrac < minFrac) {
      useFrac = minFrac;
    }
    if (useFrac > maxFrac) {
      useFrac = maxFrac;
    }

    const frontMat = mat4.create();
    // z: scale by frac
    mat4.scale(frontMat, frontMat, vec3.fromValues(1, 1, useFrac));
    const front = Rune.of({
      subRunes: [rune1],
      transformMatrix: frontMat
    });

    const backMat = mat4.create();
    // need to apply transformation in backwards order!
    mat4.translate(backMat, backMat, vec3.fromValues(0, 0, -useFrac));
    mat4.scale(backMat, backMat, vec3.fromValues(1, 1, 1 - useFrac));
    const back = Rune.of({
      subRunes: [rune2],
      transformMatrix: backMat
    });

    return Rune.of({
      subRunes: [front, back] // render front first to avoid redrawing
    });
  }

  /**
   * The depth range of the z-axis of a rune is [0,-1], this function maps the depth range of rune1 and rune2 to [0,-0.5] and [-0.5,-1] respectively.
   * @param {Rune} rune1 - Given Rune
   * @param {Rune} rune2 - Given Rune
   * @return {Rune} Resulting Runes
   *
   * @category Main
   */
  @functionDeclaration('rune1: Rune, rune2: Rune', 'Rune')
  static overlay(rune1: Rune, rune2: Rune): Rune {
    throwIfNotRune(RuneFunctions.overlay.name, rune1);
    throwIfNotRune(RuneFunctions.overlay.name, rune2);
    return RuneFunctions.overlay_frac(0.5, rune1, rune2);
  }

  // =============================================================================
  // Color functions
  // =============================================================================

  /**
   * Adds color to rune by specifying
   * the red, green, blue (RGB) value, ranging from 0.0 to 1.0.
   * RGB is additive: if all values are 1, the color is white,
   * and if all values are 0, the color is black.
   * @param {Rune} rune - The rune to add color to
   * @param {number} r - Red value [0.0-1.0]
   * @param {number} g - Green value [0.0-1.0]
   * @param {number} b - Blue value [0.0-1.0]
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune, r: number, g: number, b: number', 'Rune')
  static color(rune: Rune, r: number, g: number, b: number): Rune {
    throwIfNotRune(RuneFunctions.color.name, rune);

    const colorVector = [r, g, b, 1];
    return Rune.of({
      colors: new Float32Array(colorVector),
      subRunes: [rune]
    });
  }

  /**
   * Gives random color to the given rune.
   * The color is chosen randomly from the following nine
   * colors: red, pink, purple, indigo, blue, green, yellow, orange, brown
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static random_color(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.random_color.name, rune);
    const randomColor = hexToColor(
      colorPalette[Math.floor(Math.random() * colorPalette.length)]
    );

    return Rune.of({
      colors: new Float32Array(randomColor),
      subRunes: [rune]
    });
  }

  /**
   * Colors the given rune red (#F44336).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static red(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.red.name, rune);
    return addColorFromHex(rune, '#F44336');
  }

  /**
   * Colors the given rune pink (#E91E63s).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static pink(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.pink.name, rune);
    return addColorFromHex(rune, '#E91E63');
  }

  /**
   * Colors the given rune purple (#AA00FF).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static purple(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.purple.name, rune);
    return addColorFromHex(rune, '#AA00FF');
  }

  /**
   * Colors the given rune indigo (#3F51B5).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static indigo(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.indigo.name, rune);
    return addColorFromHex(rune, '#3F51B5');
  }

  /**
   * Colors the given rune blue (#2196F3).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static blue(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.blue.name, rune);
    return addColorFromHex(rune, '#2196F3');
  }

  /**
   * Colors the given rune green (#4CAF50).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static green(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.green.name, rune);
    return addColorFromHex(rune, '#4CAF50');
  }

  /**
   * Colors the given rune yellow (#FFEB3B).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static yellow(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.yellow.name, rune);
    return addColorFromHex(rune, '#FFEB3B');
  }

  /**
   * Colors the given rune orange (#FF9800).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static orange(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.orange.name, rune);
    return addColorFromHex(rune, '#FF9800');
  }

  /**
   * Colors the given rune brown.
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static brown(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.brown.name, rune);
    return addColorFromHex(rune, '#795548');
  }

  /**
   * Colors the given rune black (#000000).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static black(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.black.name, rune);
    return addColorFromHex(rune, '#000000');
  }

  /**
   * Colors the given rune white (#FFFFFF).
   * @param {Rune} rune - The rune to color
   * @returns {Rune} The colored Rune
   *
   * @category Color
   */
  @functionDeclaration('rune: Rune', 'Rune')
  static white(rune: Rune): Rune {
    throwIfNotRune(RuneFunctions.white.name, rune);
    return addColorFromHex(rune, '#FFFFFF');
  }
}

/** @hidden */
export class AnaglyphRune extends DrawnRune {
  private static readonly anaglyphVertexShader = `
    precision mediump float;
    attribute vec4 a_position;
    varying highp vec2 v_texturePosition;
    void main() {
        gl_Position = a_position;
        // texture position is in [0,1], vertex position is in [-1,1]
        v_texturePosition.x = (a_position.x + 1.0) / 2.0;
        v_texturePosition.y = (a_position.y + 1.0) / 2.0;
    }
    `;

  private static readonly anaglyphFragmentShader = `
    precision mediump float;
    uniform sampler2D u_sampler_red;
    uniform sampler2D u_sampler_cyan;
    varying highp vec2 v_texturePosition;
    void main() {
        gl_FragColor = texture2D(u_sampler_red, v_texturePosition)
                + texture2D(u_sampler_cyan, v_texturePosition) - 1.0;
        gl_FragColor.a = 1.0;
    }
    `;

  constructor(rune: Rune) {
    super(rune, false);
  }

  public draw = (canvas: HTMLCanvasElement) => {
    const gl = getWebGlFromCanvas(canvas);

    // before draw the runes to framebuffer, we need to first draw a white background to cover the transparent places
    const runes = white(overlay_frac(0.999999999, blank, scale(2.2, square)))
      .flatten()
      .concat(this.rune.flatten());

    // calculate the left and right camera matrices
    const halfEyeDistance = 0.03;
    const leftCameraMatrix = mat4.create();
    mat4.lookAt(
      leftCameraMatrix,
      vec3.fromValues(-halfEyeDistance, 0, 0),
      vec3.fromValues(0, 0, -0.4),
      vec3.fromValues(0, 1, 0)
    );
    const rightCameraMatrix = mat4.create();
    mat4.lookAt(
      rightCameraMatrix,
      vec3.fromValues(halfEyeDistance, 0, 0),
      vec3.fromValues(0, 0, -0.4),
      vec3.fromValues(0, 1, 0)
    );

    // left/right eye images are drawn into respective framebuffers
    const leftBuffer = initFramebufferObject(gl);
    const rightBuffer = initFramebufferObject(gl);
    drawRunesToFrameBuffer(
      gl,
      runes,
      leftCameraMatrix,
      new Float32Array([1, 0, 0, 1]),
      leftBuffer.framebuffer,
      true
    );
    drawRunesToFrameBuffer(
      gl,
      runes,
      rightCameraMatrix,
      new Float32Array([0, 1, 1, 1]),
      rightBuffer.framebuffer,
      true
    );

    // prepare to draw to screen by setting framebuffer to null
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // prepare the shader program to combine the left/right eye images
    const shaderProgram = initShaderProgram(
      gl,
      AnaglyphRune.anaglyphVertexShader,
      AnaglyphRune.anaglyphFragmentShader
    );
    gl.useProgram(shaderProgram);
    const reduPt = gl.getUniformLocation(shaderProgram, 'u_sampler_red');
    const cyanuPt = gl.getUniformLocation(shaderProgram, 'u_sampler_cyan');
    const vertexPositionPointer = gl.getAttribLocation(
      shaderProgram,
      'a_position'
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, leftBuffer.texture);
    gl.uniform1i(cyanuPt, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rightBuffer.texture);
    gl.uniform1i(reduPt, 1);

    // draw a square, which will allow the texture to be used
    // load position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, square.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionPointer, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPositionPointer);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}

/** @hidden */
export class HollusionRune extends DrawnRune {
  constructor(rune: Rune, magnitude: number) {
    super(rune, true);
    this.rune.hollusionDistance = magnitude;
  }

  private static readonly copyVertexShader = `
    precision mediump float;
    attribute vec4 a_position;
    varying highp vec2 v_texturePosition;
    void main() {
        gl_Position = a_position;
        // texture position is in [0,1], vertex position is in [-1,1]
        v_texturePosition.x = (a_position.x + 1.0) / 2.0;
        v_texturePosition.y = (a_position.y + 1.0) / 2.0;
    }
    `;

  private static readonly copyFragmentShader = `
    precision mediump float;
    uniform sampler2D uTexture;
    varying highp vec2 v_texturePosition;
    void main() {
        gl_FragColor = texture2D(uTexture, v_texturePosition);
    }
    `;

  public draw = (canvas: HTMLCanvasElement) => {
    const gl = getWebGlFromCanvas(canvas);

    const runes = white(overlay_frac(0.999999999, blank, scale(2.2, square)))
      .flatten()
      .concat(this.rune.flatten());

    // first render all the frames into a framebuffer
    const xshiftMax = runes[0].hollusionDistance;
    const period = 2000; // animations loops every 2 seconds
    const frameCount = 50; // in total 50 frames, gives rise to 25 fps
    const frameBuffer: FrameBufferWithTexture[] = [];

    const renderFrame = (framePos: number): FrameBufferWithTexture => {
      const fb = initFramebufferObject(gl);
      // prepare camera projection array
      const cameraMatrix = mat4.create();
      // let the object shift in the x direction
      // the following calculation will let x oscillate in (-xshiftMax, xshiftMax) with time
      let xshift = (framePos * (period / frameCount)) % period;
      if (xshift > period / 2) {
        xshift = period - xshift;
      }
      xshift = xshiftMax * (2 * ((2 * xshift) / period) - 1);
      mat4.lookAt(
        cameraMatrix,
        vec3.fromValues(xshift, 0, 0),
        vec3.fromValues(0, 0, -0.4),
        vec3.fromValues(0, 1, 0)
      );

      drawRunesToFrameBuffer(
        gl,
        runes,
        cameraMatrix,
        new Float32Array([1, 1, 1, 1]),
        fb.framebuffer,
        true
      );
      return fb;
    };

    for (let i = 0; i < frameCount; i += 1) {
      frameBuffer.push(renderFrame(i));
    }

    // Then, draw a frame from framebuffer for each update
    const copyShaderProgram = initShaderProgram(
      gl,
      HollusionRune.copyVertexShader,
      HollusionRune.copyFragmentShader
    );
    gl.useProgram(copyShaderProgram);
    const texturePt = gl.getUniformLocation(copyShaderProgram, 'uTexture');
    const vertexPositionPointer = gl.getAttribLocation(
      copyShaderProgram,
      'a_position'
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, square.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionPointer, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPositionPointer);

    let lastTime = 0;
    function render(timeInMs: number) {
      if (timeInMs - lastTime < period / frameCount) return;

      lastTime = timeInMs;

      const framePos
          = Math.floor(timeInMs / (period / frameCount)) % frameCount;
      const fbObject = frameBuffer[framePos];
      gl.clearColor(1.0, 1.0, 1.0, 1.0); // Set clear color to white, fully opaque
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the viewport

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbObject.texture);
      gl.uniform1i(texturePt, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    return render;
  };
}

/** @hidden */
export const isHollusionRune = (rune: DrawnRune): rune is HollusionRune => rune.isHollusion;

export const {
  beside,
  beside_frac,
  black,
  blank,
  blue,
  brown,
  circle,
  color,
  corner,
  flip_horiz,
  flip_vert,
  from_url,
  green,
  heart,
  indigo,
  make_cross,
  nova,
  orange,
  overlay,
  overlay_frac,
  pentagram,
  pink,
  purple,
  quarter_turn_left,
  quarter_turn_right,
  random_color,
  rcross,
  red,
  repeat_pattern,
  ribbon,
  rotate,
  sail,
  scale,
  scale_independent,
  square,
  stack,
  stack_frac,
  stackn,
  translate,
  triangle,
  turn_upside_down,
  white,
  yellow
} = RuneFunctions;
