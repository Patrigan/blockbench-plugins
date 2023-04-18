(function() {

	let item_parents = [
		'item/generated', 	'minecraft:item/generated',
		'item/handheld', 	'minecraft:item/handheld',
		'item/handheld_rod','minecraft:item/handheld_rod',
		'builtin/generated','minecraft:builtin/generated',
	]

	var codec = new Codec('java_multi_block', {
		name: 'Java Multi Block/Item Model',
		remember: true,
		extension: 'json',
		load_filter: {
			type: 'json',
			extensions: ['json'],
			condition(model) {
				return model.parent || model.elements || model.textures;
			}
		},
		compile(options) {
			if (options === undefined) options = {}
			var clear_elements = []
			var textures_used = []
			var element_index_lut = []
			var overflow_cubes = [];
			function computeCube(s, x, y, z) {
				if (s.export == false) return;
				//Create Element
				var element = {}
				element_index_lut[Cube.all.indexOf(s)] = clear_elements.length

				if ((options.cube_name !== false && !settings.minifiedout.value) || options.cube_name === true) {
					if (s.name !== 'cube') {
						element.name = s.name
					}
				}
				element.from = s.from.slice();
				element.to = s.to.slice();
				if (s.inflate) {
					for (var i = 0; i < 3; i++) {
						element.from[i] -= s.inflate;
						element.to[i] += s.inflate;
					}
				}
				if(element.from[0] > (x+1)*16 || element.to[0] < x*16 || element.from[1] > (y+1)*16 || element.to[1] < y*16 || element.from[2] > (z+1)*16 || element.to[2] < z*16){
					return;
				}
				if(element.from[0] < x*16){
					element.from[0] = x*16;					
				}
				if(element.to[0] > (x+1)*16){
					element.to[0] = (x+1)*16;					
				}
				if(element.from[1] < y*16){
					element.from[1] = y*16;					
				}
				if(element.to[1] > (y+1)*16){
					element.to[1] = (y+1)*16;					
				}
				if(element.from[2] < z*16){
					element.from[2] = z*16;					
				}
				if(element.to[2] > (z+1)*16){
					element.to[2] = (z+1)*16;					
				}
				for(var i=0; i<3; i++){
					if(element.from[i]<0){
						element.from[i] += 16;
					}
					if(element.to[i]<=0){
						element.to[i] += 16;
					}
					if(element.from[i]>=16){
						element.from[i] -= 16;
					}
					if(element.to[i]>16){
						element.to[i] -= 16;
					}
				}
				if (s.shade === false) {
					element.shade = false
				}
				if (!s.rotation.allEqual(0) || !s.origin.allEqual(0)) {
					var axis = s.rotationAxis()||'y';
					element.rotation = new oneLiner({
						angle: s.rotation[getAxisNumber(axis)],
						axis,
						origin: s.origin
					})
				}
				if (s.rescale) {
					if (element.rotation) {
						element.rotation.rescale = true
					} else {
						element.rotation = new oneLiner({
							angle: 0,
							axis: s.rotation_axis||'y',
							origin: s.origin,
							rescale: true
						})
					}

				}
				if (s.rotation.positiveItems() >= 2) {
					element.rotated = s.rotation
				}
				var element_has_texture
				var e_faces = {}
				function getIndexForFace(face){
					if(face == "north"){
						return [0, 1];
					} else if(face == "south"){
						return [0, 1];
					} else if(face == "east"){
						return [2, 1];
					} else if(face == "west"){
						return [2, 1];
					} else if(face == "up"){
						return [0, 2];
					} else if(face == "down"){
						return [0, 2];
					}
				}
				function recalculateUvNew(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos, index){
					var newUv = uv.slice()
					var posIndex = getIndexForFace(face)[index];
					var flip = face == "west" || face == "south" ? 1 : -1;
					var textureFlip = uv[index] <= uv[index+2] ? 1 : -1
					var cubelength = cubeTo[posIndex] - cubeFrom[posIndex];
					var elementLength = elementTo[posIndex] - elementFrom[posIndex];
					debugger;
					if(blockPos[posIndex] == -1){
						var smaller = uv[index] < uv[index+2] ? uv[index] : uv[index+2];
						var bigger = uv[index] < uv[index+2] ? uv[index+2] : uv[index];
						var adjustedSmaller = flip*textureFlip > 0 ? smaller : bigger - elementLength;
						var adjustedBigger = flip*textureFlip > 0 ? smaller + elementLength : bigger;
						newUv[index] = textureFlip > 0 ? adjustedSmaller : adjustedBigger;
						newUv[index+2] = textureFlip > 0 ? adjustedBigger : adjustedSmaller;
					}else if(blockPos[posIndex] == 1){
						var smaller = uv[index] < uv[index+2] ? uv[index] : uv[index+2];
						var bigger = uv[index] < uv[index+2] ? uv[index+2] : uv[index];
						var adjustedSmaller = flip*textureFlip > 0 ? bigger - elementLength : smaller;
						var adjustedBigger = flip*textureFlip > 0 ? bigger : smaller + elementLength;
						newUv[index] = textureFlip > 0 ? adjustedSmaller : adjustedBigger;
						newUv[index+2] = textureFlip > 0 ? adjustedBigger : adjustedSmaller;
					}else if(blockPos[posIndex] == 0){
						if(cubeFrom[posIndex] < 0 && cubeTo[posIndex] <= 16){
							newUv[index] = flip*textureFlip > 0 ? uv[index+2] - (elementLength*textureFlip) : uv[index];
							newUv[index+2] = flip*textureFlip > 0 ? uv[index+2] : uv[index] + (elementLength*textureFlip);
						}else if(cubeFrom[posIndex] >= 0 && cubeTo[posIndex] > 16){
							newUv[index] = flip*textureFlip > 0 ? uv[index] : uv[index+2] - (elementLength*textureFlip);
							newUv[index+2] = flip*textureFlip > 0 ? uv[index] + (elementLength*textureFlip)  : uv[index+2];
						}else{
							var uvStartAdjusted = cubeFrom[posIndex] < 0 ? uv[index] + (cubeFrom[posIndex]*-1*textureFlip) : uv[index];
							var uvToAdjusted = cubeTo[posIndex] > 16 ? uv[index+2] - ((cubeTo[posIndex]-16)*textureFlip) : uv[index+2];
							newUv[index] = flip*textureFlip > 0 ? uvStartAdjusted : uvToAdjusted - (elementLength*textureFlip);
							newUv[index+2] = flip*textureFlip > 0 ? uvStartAdjusted + (elementLength*textureFlip)  : uvToAdjusted;
						}
					}
					debugger;
					return newUv;
				}
				function recalculateHorizontalUv(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos){
					var newUv = uv.slice();
					var index = getIndexForFace(face);
					var flip = face == "west" || face == "south" ? 1 : -1
					if(blockPos[index[0]] == -1 * flip){
						newUv[2] = newUv[0] + elementTo[index[0]] - elementFrom[index[0]];
					}else if(blockPos[index[0]] == 0){
						if(cubeFrom[index[0]] < 0 && flip == 1){
							newUv[0] = newUv[0] + Math.abs(cubeFrom[index[0]]);
							newUv[2] = newUv[0] + elementTo[index[0]] - elementFrom[index[0]];
						}else if(cubeTo[index[0]] > 16 && flip == 1){
							newUv[2] = newUv[2] - Math.abs(cubeTo[index[0]]) + 16;
							newUv[0] = newUv[2] - elementTo[index[0]] + elementFrom[index[0]];
						}else if(cubeFrom[index[0]] < 0 && flip == -1){
							newUv[2] = newUv[0] + elementTo[index[0]] - elementFrom[index[0]];
						}else if(cubeTo[index[0]] > 16 && flip == -1){
							newUv[0] = newUv[2] - elementTo[index[0]] + elementFrom[index[0]];
						}
					}else if(blockPos[index[0]] == 1 * flip){
						newUv[0] = newUv[2] - elementTo[index[0]] + elementFrom[index[0]];
					}
					if(blockPos[index[1]] == -1 * flip){
						newUv[3] = newUv[1] + elementTo[index[1]] - elementFrom[index[1]];
					}else if(blockPos[index[1]] == 0){
						if(cubeFrom[index[1]] < 0 && flip == 1){
							newUv[3] = newUv[1] + elementTo[index[1]] - elementFrom[index[1]];
						}else if(cubeTo[index[1]] > 16 && flip == 1){
							newUv[3] = newUv[3] - Math.abs(cubeTo[index[1]]) + 16;
							newUv[1] = newUv[3] - elementTo[index[1]] + elementFrom[index[1]];
						}else if(cubeFrom[index[1]] < 0 && flip == -1){
							newUv[1] = newUv[1] + Math.abs(cubeFrom[index[1]]);
							newUv[3] = newUv[1] + elementTo[index[1]] - elementFrom[index[1]];
						}else if(cubeTo[index[1]] > 16 && flip == -1){
							newUv[1] = newUv[3] - elementTo[index[1]] + elementFrom[index[1]];
						}
					}else if(blockPos[index[1]] == 1 * flip){
						newUv[1] = newUv[3] - elementTo[index[1]] + elementFrom[index[1]];
					}
					return newUv;
				}
				function recalculateVerticalUv(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos){
					var newUv = uv.slice();
					var index = getIndexForFace(face);
					if(blockPos[index[0]] == 0){
						newUv[2] = newUv[0] + elementTo[index[0]] - elementFrom[index[0]];
					}
					if(blockPos[index[0]] == 1){
						newUv[0] = newUv[2] - elementTo[index[0]] + elementFrom[index[0]];
					}
					if(blockPos[index[1]] == -1){
						newUv[3] = newUv[1] + elementTo[index[0]] - elementFrom[index[0]];
					}
					if(blockPos[index[1]] == 0){
						if(cubeFrom[index[0]] < 0){
							newUv[1] = newUv[1] + Math.abs(cubeFrom[index[0]]);
							newUv[3] = newUv[1] + elementTo[index[0]] - elementFrom[index[0]];
						}else if(cubeTo[index[0]] > 16){
							newUv[3] = newUv[3] - Math.abs(cubeTo[index[0]]) + 16;
							newUv[1] = newUv[3] - elementTo[index[0]] + elementFrom[index[0]];
						}
					}
					if(blockPos[index[1]] == 1){
						newUv[1] = newUv[3] - elementTo[index[1]] + elementFrom[index[1]];
					}
					return newUv;
				}
				function recalculateUv(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos){
					//if(face == "up" || face == "down"){
					//	return recalculateVerticalUv(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos);
					//}else{
						var index0 = recalculateUvNew(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos, 0);
						var index1 = recalculateUvNew(face, uv, elementFrom, elementTo, cubeFrom, cubeTo, blockPos, 1);
						return [index0[0], index1[1], index0[2], index1[3]];
					//}
				}
				for (var face in s.faces) {
					if (s.faces.hasOwnProperty(face)) {
						if (s.faces[face].texture !== null) {
							var tag = new oneLiner()
							if (s.faces[face].enabled !== false) {
								tag.uv = s.faces[face].uv.slice();
								tag.uv = recalculateUv(face, tag.uv, element.from, element.to, s.from.slice(), s.to.slice(), [x, y, z]);
								tag.uv.forEach((n, i) => {
									tag.uv[i] = n * 16 / UVEditor.getResolution(i%2);
								})
							}
							if (s.faces[face].rotation) {
								tag.rotation = s.faces[face].rotation
							}
							if (s.faces[face].texture) {
								var tex = s.faces[face].getTexture()
								if (tex) {
									tag.texture = '#' + tex.id
									textures_used.safePush(tex)
								}
								element_has_texture = true
							}
							if (!tag.texture) {
								tag.texture = '#missing'
							}
							if (s.faces[face].cullface) {
								tag.cullface = s.faces[face].cullface
							}
							if (s.faces[face].tint >= 0) {
								tag.tintindex = s.faces[face].tint
							}
							e_faces[face] = tag
						}
					}
				}
				//Gather Textures
				if (!element_has_texture) {
					element.color = s.color
				}
				element.faces = e_faces

				function inVd(n) {
					return n < -16 || n > 32; 
				}
				if (inVd(element.from[0]) ||
					inVd(element.from[1]) ||
					inVd(element.from[2]) ||
					inVd(element.to[0]) ||
					inVd(element.to[1]) ||
					inVd(element.to[2])
				) {
					overflow_cubes.push(s);
				}
				if (Object.keys(element.faces).length) {
					clear_elements.push(element)
				}
			}
			function deepContains(array, blockPos){
				var result = false;
				array.forEach(arrayBlockPos => {if(arrayBlockPos[0] == blockPos[0] && arrayBlockPos[1] == blockPos[1] && arrayBlockPos[2] == blockPos[2]){result = true;}});
				return result;
			}
			function determineBlockPos(arr) {
				var result = []
				var i = 0;
				if (!arr || !arr.length) {
					return result;
				}
				for (i=0; i<arr.length; i++) {
					if (arr[i].type === 'cube') {
						var cubeResult = determineBlockPosForCube(arr[i]);
						cubeResult.forEach(posResult => {if(!deepContains(result, posResult)){
							result.push(posResult);
						}})
					} else if (arr[i].type === 'group') {
						var groupResult = determineBlockPos(arr[i].children);
						groupResult.forEach(posResult => {if(!deepContains(result, posResult)){
							result.push(posResult);
						}})
					}
				}
				return result;
			}
			function determineBlockPosForCube(cube){
				var minX = Math.floor(cube.from[0]/16);
				var minY = Math.floor(cube.from[1]/16);
				var minZ = Math.floor(cube.from[2]/16);
				var maxX = Math.floor((cube.to[0]-1)/16);
				var maxY = Math.floor((cube.to[1]-1)/16);
				var maxZ = Math.floor((cube.to[2]-1)/16);
				var result = [];
				for(var x = minX; x < maxX+1; x++){	
					for(var y = minY; y < maxY+1; y++){
						for(var z = minZ; z < maxZ+1; z++){
							result.push([x, y, z]);
						}
					}
				}
				return result;
			}
			function iterate(arr, x, y, z) {
				var i = 0;
				if (!arr || !arr.length) {
					return;
				}
				for (i=0; i<arr.length; i++) {
					if (arr[i].type === 'cube') {
						computeCube(arr[i], x, y, z)
					} else if (arr[i].type === 'group') {
						iterate(arr[i].children, x, y, z)
					}
				}
			}
			function checkExport(key, condition) {
				key = options[key]
				if (key === undefined) {
					return condition;
				} else {
					return key
				}
			}
			function blockModelForBlockPos(options, x, y, z){
				clear_elements = []
				textures_used = []
				element_index_lut = []
				overflow_cubes = [];
				iterate(Outliner.root, x, y, z)
				var isTexturesOnlyModel = clear_elements.length === 0 && checkExport('parent', Project.parent != '')
				var texturesObj = {}
				Texture.all.forEach(function(t, i){
					var link = t.javaTextureLink()
					if (t.particle) {
						texturesObj.particle = link
					}
					if (!textures_used.includes(t) && !isTexturesOnlyModel) return;
					if (t.id !== link.replace(/^#/, '')) {
						texturesObj[t.id] = link
					}
				})

				if (options.prevent_dialog !== true && overflow_cubes.length > 0 && settings.dialog_larger_cubes.value) {
					Blockbench.showMessageBox({
						translateKey: 'model_clipping',
						icon: 'settings_overscan',
						message: tl('message.model_clipping.message', [overflow_cubes.length]),
						buttons: ['dialog.scale.select_overflow', 'dialog.ok'],
						confirm: 1,
						cancel: 1,
					}, (result) => {
						if (result == 0) {
							selected.splice(0, Infinity, ...overflow_cubes)
							updateSelection();
						}
					})
				}
				if (options.prevent_dialog !== true && clear_elements.length && item_parents.includes(Project.parent)) {
					Blockbench.showMessageBox({
						translateKey: 'invalid_builtin_parent',
						icon: 'info',
						message: tl('message.invalid_builtin_parent.message', [Project.parent])
					})
					Project.parent = '';
				}

				var blockmodel = {blockPos: [x+1, y+1, z+1]}
				if (checkExport('comment', settings.credit.value)) {
					blockmodel.credit = settings.credit.value
				}
				if (checkExport('parent', Project.parent != '')) {
					blockmodel.parent = Project.parent
				}
				if (checkExport('ambientocclusion', Project.ambientocclusion === false)) {
					blockmodel.ambientocclusion = false
				}
				if (Project.texture_width !== 16 || Project.texture_height !== 16) {
					blockmodel.texture_size = [Project.texture_width, Project.texture_height]
				}
				if (checkExport('textures', Object.keys(texturesObj).length >= 1)) {
					blockmodel.textures = texturesObj
				}
				if (checkExport('elements', clear_elements.length >= 1)) {
					blockmodel.elements = clear_elements
				}
				if (checkExport('front_gui_light', Project.front_gui_light)) {
					blockmodel.gui_light = 'front';
				}
				if (checkExport('overrides', Project.overrides)) {
					blockmodel.overrides = Project.overrides;
				}
				if (checkExport('display', Object.keys(Project.display_settings).length >= 1)) {
					var new_display = {}
					var entries = 0;
					for (var i in DisplayMode.slots) {
						var key = DisplayMode.slots[i]
						if (DisplayMode.slots.hasOwnProperty(i) && Project.display_settings[key] && Project.display_settings[key].export) {
							new_display[key] = Project.display_settings[key].export()
							entries++;
						}
					}
					if (entries) {
						blockmodel.display = new_display
					}
				}
				if (checkExport('groups', (settings.export_groups.value && Group.all.length))) {
					var groups = compileGroups(false, element_index_lut)
					var i = 0;
					while (i < groups.length) {
						if (typeof groups[i] === 'object') {
							i = Infinity
						}
						i++
					}
					if (i === Infinity) {
						blockmodel.groups = groups
					}
				}
				return blockmodel;
			}
			var blockmodels = [];
			var blockPosArr = determineBlockPos(Outliner.root);
			blockPosArr.forEach(blockPos => blockmodels.push(blockModelForBlockPos(options, blockPos[0], blockPos[1], blockPos[2])));
			this.dispatchEvent('compile', {model: blockmodels, options});
			if (options.raw) {
				return blockmodels
			} else {
				return autoStringify(blockmodels)
			}
		},
		export(){
			function getFacing(facingInt){
				switch(facingInt){
					case 0: return "north";
					case 1: return "east";
					case 2: return "south";
					case 3: return "west";
				}
			}
			function generateBlockStates(fileName, compiled){
				let variants = {};
				for(var i=0; i<compiled.length; i++){
					for(var facingInt=0; facingInt<4; facingInt++){
						let variant = {};
						variant["y"] = facingInt*90;
						variant["model"] = "modId:block/"+fileName+"_"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2];
						variants["facing="+getFacing(facingInt)+",part=part_"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]] = variant;
					}
				}
				for(var facingInt=0; facingInt<4; facingInt++){
					let variant = {};
					variant["y"] = facingInt*90;
					variant["model"] = "modId:block/"+fileName;
					variants["facing="+getFacing(facingInt)+",part=complete"] = variant;
				}
				return {"variants":variants}
			}
			function generateItem(fileName){
				return {"parent":"modId:block/"+fileName}
			}
			function generateVoxelShapes(compiled){
				var centered = Format.centered_grid;
				var data = "public static Map<String, Map<Direction, VoxelShape>> makeShapes(){\n\tMap<String, Map<Direction, VoxelShape>> shapes = new HashMap<>();\n";
				for(var i = 0; i< compiled.length; ++i){
					var current = compiled[i];
					data += "\tVoxelShape shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+" = VoxelShapes.empty();\n";
					for(var j = 0; j< current.elements.length; ++j){
						var cube = current.elements[j];
						
						var from = cube.from;
						var to = cube.to;

						data += "\tshape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+" = VoxelShapes.join(shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+", VoxelShapes.box("
							.concat(formatVec3(from, centered)).concat(", ")
							.concat(formatVec3(to, centered))
							.concat("), IBooleanFunction.OR);\n");
					}
					data += "\tMap<Direction, VoxelShape> directions"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+" = new HashMap<>();\n";
					data += "\tdirections"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+".put(NORTH, shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+");\n";
					data += "\tdirections"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+".put(EAST, VoxelShapeUtil.rotateShape(Direction.NORTH, Direction.EAST, shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+"));\n";
					data += "\tdirections"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+".put(WEST, VoxelShapeUtil.rotateShape(Direction.NORTH, Direction.WEST, shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+"));\n";
					data += "\tdirections"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+".put(SOUTH, VoxelShapeUtil.rotateShape(Direction.NORTH, Direction.SOUTH, shape"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+"));\n";
					data += "\tshapes.put(\""+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+"\", directions"+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+");\n";
				}
				data += "\n\treturn shapes;\n}";
				return data;
			}
			let packZip = new JSZip();
			var compiled = this.compile({raw:true});
			let modelsFolder = packZip.folder('models');
			let blockFolder = modelsFolder.folder('block');
			for(var i=0; i<compiled.length; i++){
				blockFolder.file(this.fileName()+'_'+compiled[i].blockPos[0]+compiled[i].blockPos[1]+compiled[i].blockPos[2]+'.json', autoStringify(compiled[i]));
			}
			blockFolder.file(this.fileName()+'.json', Codecs.java_block.compile());
			let itemFolder = modelsFolder.folder('item');
			itemFolder.file(this.fileName()+'.json', autoStringify(generateItem(this.fileName())));
			let blockstatesFolder = packZip.folder('blockstates');
			blockstatesFolder.file(this.fileName()+'.json', autoStringify(generateBlockStates(this.fileName(), compiled)))
			
			let voxelShapesFolder = packZip.folder('voxelShapes');
			voxelShapesFolder.file(this.fileName()+'.java', generateVoxelShapes(compiled));
			
			packZip.generateAsync({type: 'blob'}).then(content => {
				Blockbench.export({
					type: 'Zip Archive',
					extensions: ['zip'],
					name: name !== '' ? name : this.fileName(),
					content: content,
					savetype: 'zip'
				});
			});
		}
	})
	var exportMultiBlockAction;
	
	Plugin.register('multi_block_exporter', {
		title: 'Multi Block Exporter',
		icon: 'icon-format_block',
		author: 'Patrigan',
		description: 'Exports a multi block in different jsons',
		tags: ["Minecraft: Java Edition"],
		version: '0.1.1',
		variant: 'both',

		onload() {
			exportMultiBlockAction = new Action({
				id: 'multi_block_exporter',
				name: 'Multi Block Exporter',
				icon: 'icon-format_block',
				category: 'file',
				condition: (_) => Format.id === "java_block",
				click: () => {
					codec.export();
				},
			});
			MenuBar.addAction(exportMultiBlockAction, "file.export");
		},
		onunload() {
			this.onuninstall();
		},
		onuninstall() {
			exportMultiBlockAction.delete();
		}
	})
})()
