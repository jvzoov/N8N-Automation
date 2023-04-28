import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../test/nodes/Helpers';

import nock from 'nock';

const response = {
	TextDetections: [
		{
			Confidence: 99.63162231445312,
			DetectedText: 'OMEGA',
			Geometry: {
				BoundingBox: {
					Height: 0.01825360208749771,
					Left: 0.375,
					Top: 0.40679457783699036,
					Width: 0.095703125,
				},
				Polygon: [
					{
						X: 0.375,
						Y: 0.40679457783699036,
					},
					{
						X: 0.470703125,
						Y: 0.40679457783699036,
					},
					{
						X: 0.470703125,
						Y: 0.42504817247390747,
					},
					{
						X: 0.375,
						Y: 0.42504817247390747,
					},
				],
			},
			Id: 0,
			Type: 'LINE',
		},
		{
			Confidence: 89.08098602294922,
			DetectedText: 'Seamo',
			Geometry: {
				BoundingBox: {
					Height: 0.02146334946155548,
					Left: 0.36888423562049866,
					Top: 0.42747923731803894,
					Width: 0.07085935771465302,
				},
				Polygon: [
					{
						X: 0.3693029284477234,
						Y: 0.42747923731803894,
					},
					{
						X: 0.43974360823631287,
						Y: 0.42895475029945374,
					},
					{
						X: 0.43932491540908813,
						Y: 0.4489425718784332,
					},
					{
						X: 0.36888423562049866,
						Y: 0.44746705889701843,
					},
				],
			},
			Id: 1,
			Type: 'LINE',
		},
		{
			Confidence: 100,
			DetectedText: '25',
			Geometry: {
				BoundingBox: {
					Height: 0.02259969897568226,
					Left: 0.5693359375,
					Top: 0.47807055711746216,
					Width: 0.0380859375,
				},
				Polygon: [
					{
						X: 0.5693359375,
						Y: 0.47807055711746216,
					},
					{
						X: 0.607421875,
						Y: 0.47807055711746216,
					},
					{
						X: 0.607421875,
						Y: 0.5006702542304993,
					},
					{
						X: 0.5693359375,
						Y: 0.5006702542304993,
					},
				],
			},
			Id: 2,
			Type: 'LINE',
		},
		{
			Confidence: 96.94922637939453,
			DetectedText: 'CO-AXIAL',
			Geometry: {
				BoundingBox: {
					Height: 0.007822972722351551,
					Left: 0.38671875,
					Top: 0.536308228969574,
					Width: 0.0712890625,
				},
				Polygon: [
					{
						X: 0.38671875,
						Y: 0.536308228969574,
					},
					{
						X: 0.4580078125,
						Y: 0.536308228969574,
					},
					{
						X: 0.4580078125,
						Y: 0.5441312193870544,
					},
					{
						X: 0.38671875,
						Y: 0.5441312193870544,
					},
				],
			},
			Id: 3,
			Type: 'LINE',
		},
		{
			Confidence: 62.80826187133789,
			DetectedText: 'O RONOMETER',
			Geometry: {
				BoundingBox: {
					Height: 0.012169068679213524,
					Left: 0.3642578125,
					Top: 0.546738862991333,
					Width: 0.1171875,
				},
				Polygon: [
					{
						X: 0.3642578125,
						Y: 0.546738862991333,
					},
					{
						X: 0.4814453125,
						Y: 0.546738862991333,
					},
					{
						X: 0.4814453125,
						Y: 0.5589079260826111,
					},
					{
						X: 0.3642578125,
						Y: 0.5589079260826111,
					},
				],
			},
			Id: 4,
			Type: 'LINE',
		},
		{
			Confidence: 97.32681274414062,
			DetectedText: '150m/500ft',
			Geometry: {
				BoundingBox: {
					Height: 0.017750654369592667,
					Left: 0.37873557209968567,
					Top: 0.5579395294189453,
					Width: 0.08430694788694382,
				},
				Polygon: [
					{
						X: 0.3789936900138855,
						Y: 0.5579395294189453,
					},
					{
						X: 0.4630425274372101,
						Y: 0.5592598915100098,
					},
					{
						X: 0.46278440952301025,
						Y: 0.5756902098655701,
					},
					{
						X: 0.37873557209968567,
						Y: 0.5743698477745056,
					},
				],
			},
			Id: 5,
			Type: 'LINE',
		},
		{
			Confidence: 52.119625091552734,
			DetectedText: 'Swiss',
			Geometry: {
				BoundingBox: {
					Height: 0.01422857865691185,
					Left: 0.36532166600227356,
					Top: 0.6632969975471497,
					Width: 0.034069545567035675,
				},
				Polygon: [
					{
						X: 0.3667183816432953,
						Y: 0.6632969975471497,
					},
					{
						X: 0.399391233921051,
						Y: 0.668179988861084,
					},
					{
						X: 0.3979945182800293,
						Y: 0.6775255799293518,
					},
					{
						X: 0.36532166600227356,
						Y: 0.6726425886154175,
					},
				],
			},
			Id: 6,
			Type: 'LINE',
		},
		{
			Confidence: 96.12210083007812,
			DetectedText: 'MADE',
			Geometry: {
				BoundingBox: {
					Height: 0.014023925177752972,
					Left: 0.4396541118621826,
					Top: 0.6636514067649841,
					Width: 0.032820552587509155,
				},
				Polygon: [
					{
						X: 0.4396541118621826,
						Y: 0.6681290864944458,
					},
					{
						X: 0.4711160361766815,
						Y: 0.6636514067649841,
					},
					{
						X: 0.4724746644496918,
						Y: 0.6731976270675659,
					},
					{
						X: 0.44101274013519287,
						Y: 0.6776753664016724,
					},
				],
			},
			Id: 7,
			Type: 'LINE',
		},
		{
			Confidence: 99.63162231445312,
			DetectedText: 'OMEGA',
			Geometry: {
				BoundingBox: {
					Height: 0.01825360208749771,
					Left: 0.375,
					Top: 0.40679457783699036,
					Width: 0.095703125,
				},
				Polygon: [
					{
						X: 0.375,
						Y: 0.40679457783699036,
					},
					{
						X: 0.470703125,
						Y: 0.40679457783699036,
					},
					{
						X: 0.470703125,
						Y: 0.42504817247390747,
					},
					{
						X: 0.375,
						Y: 0.42504817247390747,
					},
				],
			},
			Id: 8,
			ParentId: 0,
			Type: 'WORD',
		},
		{
			Confidence: 89.08098602294922,
			DetectedText: 'Seamo',
			Geometry: {
				BoundingBox: {
					Height: 0.02107013761997223,
					Left: 0.36888423562049866,
					Top: 0.42767584323883057,
					Width: 0.07085935771465302,
				},
				Polygon: [
					{
						X: 0.3693380355834961,
						Y: 0.42767584323883057,
					},
					{
						X: 0.43974360823631287,
						Y: 0.42895475029945374,
					},
					{
						X: 0.4392898380756378,
						Y: 0.4487459659576416,
					},
					{
						X: 0.36888423562049866,
						Y: 0.44746705889701843,
					},
				],
			},
			Id: 9,
			ParentId: 1,
			Type: 'WORD',
		},
		{
			Confidence: 100,
			DetectedText: '25',
			Geometry: {
				BoundingBox: {
					Height: 0.02259969897568226,
					Left: 0.5693359375,
					Top: 0.47807055711746216,
					Width: 0.0380859375,
				},
				Polygon: [
					{
						X: 0.5693359375,
						Y: 0.47807055711746216,
					},
					{
						X: 0.607421875,
						Y: 0.47807055711746216,
					},
					{
						X: 0.607421875,
						Y: 0.5006702542304993,
					},
					{
						X: 0.5693359375,
						Y: 0.5006702542304993,
					},
				],
			},
			Id: 10,
			ParentId: 2,
			Type: 'WORD',
		},
		{
			Confidence: 96.94922637939453,
			DetectedText: 'CO-AXIAL',
			Geometry: {
				BoundingBox: {
					Height: 0.007822972722351551,
					Left: 0.38671875,
					Top: 0.536308228969574,
					Width: 0.0712890625,
				},
				Polygon: [
					{
						X: 0.38671875,
						Y: 0.536308228969574,
					},
					{
						X: 0.4580078125,
						Y: 0.536308228969574,
					},
					{
						X: 0.4580078125,
						Y: 0.5441312193870544,
					},
					{
						X: 0.38671875,
						Y: 0.5441312193870544,
					},
				],
			},
			Id: 11,
			ParentId: 3,
			Type: 'WORD',
		},
		{
			Confidence: 39.59382629394531,
			DetectedText: 'O',
			Geometry: {
				BoundingBox: {
					Height: 0.0069537535309791565,
					Left: 0.3642578125,
					Top: 0.5493465065956116,
					Width: 0.0126953125,
				},
				Polygon: [
					{
						X: 0.3642578125,
						Y: 0.5493465065956116,
					},
					{
						X: 0.376953125,
						Y: 0.5493465065956116,
					},
					{
						X: 0.376953125,
						Y: 0.5563002824783325,
					},
					{
						X: 0.3642578125,
						Y: 0.5563002824783325,
					},
				],
			},
			Id: 12,
			ParentId: 4,
			Type: 'WORD',
		},
		{
			Confidence: 86.02269744873047,
			DetectedText: 'RONOMETER',
			Geometry: {
				BoundingBox: {
					Height: 0.012169068679213524,
					Left: 0.376953125,
					Top: 0.546738862991333,
					Width: 0.1044921875,
				},
				Polygon: [
					{
						X: 0.376953125,
						Y: 0.546738862991333,
					},
					{
						X: 0.4814453125,
						Y: 0.546738862991333,
					},
					{
						X: 0.4814453125,
						Y: 0.5589079260826111,
					},
					{
						X: 0.376953125,
						Y: 0.5589079260826111,
					},
				],
			},
			Id: 13,
			ParentId: 4,
			Type: 'WORD',
		},
		{
			Confidence: 97.32681274414062,
			DetectedText: '150m/500ft',
			Geometry: {
				BoundingBox: {
					Height: 0.01752207987010479,
					Left: 0.37873557209968567,
					Top: 0.5580538511276245,
					Width: 0.08430694788694382,
				},
				Polygon: [
					{
						X: 0.379031240940094,
						Y: 0.5580538511276245,
					},
					{
						X: 0.4630425274372101,
						Y: 0.5592598915100098,
					},
					{
						X: 0.46274685859680176,
						Y: 0.5755759477615356,
					},
					{
						X: 0.37873557209968567,
						Y: 0.5743698477745056,
					},
				],
			},
			Id: 14,
			ParentId: 5,
			Type: 'WORD',
		},
		{
			Confidence: 52.119625091552734,
			DetectedText: 'Swiss',
			Geometry: {
				BoundingBox: {
					Height: 0.013163384981453419,
					Left: 0.36532166600227356,
					Top: 0.6638295650482178,
					Width: 0.034069545567035675,
				},
				Polygon: [
					{
						X: 0.36680689454078674,
						Y: 0.6638295650482178,
					},
					{
						X: 0.399391233921051,
						Y: 0.668179988861084,
					},
					{
						X: 0.39790600538253784,
						Y: 0.6769929528236389,
					},
					{
						X: 0.36532166600227356,
						Y: 0.6726425886154175,
					},
				],
			},
			Id: 15,
			ParentId: 6,
			Type: 'WORD',
		},
		{
			Confidence: 96.12210083007812,
			DetectedText: 'MADE',
			Geometry: {
				BoundingBox: {
					Height: 0.013045405969023705,
					Left: 0.4396541118621826,
					Top: 0.6641407012939453,
					Width: 0.032820552587509155,
				},
				Polygon: [
					{
						X: 0.4396541118621826,
						Y: 0.6681290864944458,
					},
					{
						X: 0.47102099657058716,
						Y: 0.6641407012939453,
					},
					{
						X: 0.4724746644496918,
						Y: 0.6731976270675659,
					},
					{
						X: 0.44110777974128723,
						Y: 0.6771860718727112,
					},
				],
			},
			Id: 16,
			ParentId: 7,
			Type: 'WORD',
		},
	],
	TextModelVersion: '3.0',
};

jest.mock('../GenericFunctions', () => {
	const originalModule = jest.requireActual('../GenericFunctions');
	return {
		...originalModule,
		awsApiRequest: jest.fn(async (method: string) => {
			console.log('method', method);
			if (method === 'POST') {
				return {
					response,
				};
			}
		}),
	};
});

describe('Test AWS Rekogntion Node', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);
	const baseUrl = 'https://rekognition.us-east-1.amazonaws.com';

	nock(baseUrl).post('/.*/').reply(200, response);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../GenericFunctions');
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});
