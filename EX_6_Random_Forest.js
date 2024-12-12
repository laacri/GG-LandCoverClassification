/*
   _______________________________
  | Geomatics and Geoinformation  |
  |       -  EXERCISE 6  -        |
  |   Machine Learning with GEE   |
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾  
        Cristiana Di Tullio
*/


// STEP 1: choosing ROI of interest

var geometry = 
    /* color: #0b4a8b */
    /* displayProperties: [
    {
        "type": "rectangle"
    }
    ] */
    ee.Geometry.Polygon(
        [[[28.91676019895413, 41.294658644323306],
        [28.91676019895413, 40.92734582701647],
        [29.214764349344755, 40.92734582701647],
        [29.214764349344755, 41.294658644323306]]], null, false);


// STEP 2: import Sentinel-2 MSI Level-2A image collection

var S2_SR_coll = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED"),
    ESA_world_LCs = ee.ImageCollection("ESA/WorldCover/v200");


/* Note: in Earth Engine editor, Steps 1 and 2 can be collapsed automatically as Imports */


// STEP 3: filter image collection 
var S2_SR_coll_filtered = S2_SR_coll.filterDate('2021-01-01', '2024-01-01')           // by desired time interval
                               .filterBounds(geometry)                                // by desired region of interest
                               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50));  // by property cloud percentage < 50%
                            
print('Sentinel-2 filtered collection size:', S2_SR_coll_filtered.size());


// STEP 4: perform cloud masking
// Note: the Sentinel-2 algorithms doesn't provide a good enough result, leaving
// a lot of clouds unmasked. Therefore, for the sake of this exercise, in the final version 
// of the script it has been removed and replaced directly with the more precise method using Cloud Score+.
// The following lines and function are taken from the dataset webpage.

// Cloud Score+ image collection. Note Cloud Score+ is produced from Sentinel-2
// Level 1C data and can be applied to either L1C or L2A collections.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance.
var QA_BAND = 'cs_cdf';

// The threshold for masking; values between 0.50 and 0.65 generally work well.
// Higher values will remove thin clouds, haze & cirrus shadows.
var CLEAR_THRESHOLD = 0.60;

// Function to mask clouds using the Cloud Score+ cloud masking
// and to apply the radiometric scaling factor
function cloud_score_plus_maskS2clouds_and_RadiometricScaling(image) {
//               Masking cloud pixels                    Applying radiometric scaling factor
//                        |                                               |
//                        V                                               |
//              making the pixels covered                                 |
//              by clouds transparent                                     |
//             (ignored by reducers)                                      V
  return image.updateMask(image.select(QA_BAND).gte(CLEAR_THRESHOLD)).multiply(0.0001);
}

// Applying radiometric scaling factors and Cloud Score+ cloud masking
var S2_SR_coll_filtered_cloud_masked =  S2_SR_coll_filtered.linkCollection(csPlus, [QA_BAND])
                                                           .map(cloud_score_plus_maskS2clouds_and_RadiometricScaling);
//                                                              R     G     B
Map.addLayer(S2_SR_coll_filtered_cloud_masked.first(), {bands:['B4', 'B3', 'B2'], min:0, max:0.3}, 'S2_SR_coll_filtered first image RGB cloud score masking', false);


// STEP 5: compute aggregated (median) image
var median_SR_S2_image = S2_SR_coll_filtered_cloud_masked.median().select(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12']);
print('Median Sentinel-2 SR image:', median_SR_S2_image);
// True color composite
//                                        R     G     B
Map.addLayer(median_SR_S2_image, {bands:['B4', 'B3', 'B2'], min:0, max:0.3}, 'median_SR_S2_image RGB (true color composite for cloud score masking)', false);
// False color composite
//                                        SWIR1  NIR   G
Map.addLayer(median_SR_S2_image, {bands:['B11', 'B8', 'B3'], min:0, max:0.3}, 'median_SR_S2_image SWIR1 NI RG (false color composite for cloud score masking)', false);


// STEP 6: import ESA WorldCover 10m v200 as a label source for training
// (our "ground truth" land cover map)
var ESA_LC_image = ESA_world_LCs.first();
print('ESA 2021 WorldCover image:', ESA_LC_image);


// STEP 7: remapping of class values and color palette
// Remap the 11 land cover class values to a 0-10 sequential series
var old_value_Classes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
var new_value_Classes = ee.List.sequence(0, 10);
print('Old value classes:', old_value_Classes);
print('New value classes:', new_value_Classes);
print('Number of classes:', new_value_Classes.size());
//                              Mapping old values          Casting values          Rename the band
//                                 to new ones              to unsigned integers   'LC' as 'Land Cover'
//                                      |                   to waste less memory         |
//                                      |                                 |              |
//                                      V                                 V              V
ESA_LC_image = ESA_LC_image.remap(old_value_Classes, new_value_Classes).toByte().rename('LC');
print('ESA LC remapped image:', ESA_LC_image);
// Defining the color palette for the LC classes
var LC_palette = ['006400',  // 0   Tree cover
                  'ffbb22',  // 1   Shrubland
                  'ffff4c',  // 2   Grassland
                  'f096ff',  // 3   Cropland
                  'fa0000',  // 4   Built-up
                  'b4b4b4',  // 5   Bare / sparse vegetation
                  'f0f0f0',  // 6   Snow and ice
                  '0064c8',  // 7   Permanent water bodies
                  '0096a0',  // 8   Herbaceous wetland
                  '00cf75',  // 9   Mangroves
                  'fae6a0']; // 10  Moss and lichen
// Visualizing the ESA world cover with "true" land cover labels
Map.addLayer(ESA_LC_image, {min:0, max:10, palette:LC_palette}, 'ESA_LC_image 2021', false);


// STEP 8: prepare dataset
//                                Add Land Cover                     Extract specified 
//                               (the target class)             n. of samples for each value
//                               to aggregated image               in specified classBand
//                                       |                                   |
//                                       V                                   V
var datasetSample = median_SR_S2_image.addBands(ESA_LC_image).stratifiedSample({
    scale:10,           // spatial resolution to sample datapoints
    region:geometry,    // region to sample pixels from
    geometries: true,   // enable export of pixel coordinates
    tileScale: 4,       // to avoid memory error
    numPoints: 240,     // number of pixels to sample per class 
    classBand: 'LC'     // name of target classBand
});
// Print dataset information
print('Dataset sample:', datasetSample);
print('Dataset sample size:', datasetSample.size());   // should be 200 * 11 = 2200
// Visualize dataset layer
Map.addLayer(datasetSample, {}, 'datasetSample', false);
// Visualize histogram of land cover classes
print('Dataset sample frequency histogram:', datasetSample.reduceColumns(ee.Reducer.frequencyHistogram(), ['LC']));


// STEP 9: split dataset in training and validation
datasetSample = datasetSample.randomColumn();

print('Dataset sample after training-validation split:', datasetSample);

// Select samples for training dataset
var trainingSample = datasetSample.filter(ee.Filter.lte('random', 0.8));
// Select samples for validation dataset
var validationSample = datasetSample.filter(ee.Filter.gt('random', 0.8));

// Training dataset information
print('Training sample:', trainingSample);
print('Training sample size:', trainingSample.size());
Map.addLayer(trainingSample, {}, 'trainingSample', false);
print('Training sample frequency histogram:', trainingSample.reduceColumns(ee.Reducer.frequencyHistogram(), ['LC']));

// Validation dataset information
print('Validation sample:', validationSample);
print('Validation sample size:', validationSample.size());
Map.addLayer(validationSample, {}, 'validationSample', false);
print('Validation sample frequency histogram:', validationSample.reduceColumns(ee.Reducer.frequencyHistogram(), ['LC']));


// STEP 10: set up Random Forest model
// Initialize parameter
var number_of_trees = 100;
// Define the idle classifier
var RF_classifier = ee.Classifier.smileRandomForest(number_of_trees);


// STEP 11: train the model
var trained_classifier = RF_classifier.train({
    features: trainingSample,                           // training dataset
    classProperty: 'LC',                                // our classification target (LC column)
    inputProperties: median_SR_S2_image.bandNames()     // input features for classification
});

print('Input features for classification:', median_SR_S2_image.bandNames());
print('Trained classifier, explained:', trained_classifier.explain());


// STEP 12: inspect training confusion matrix
var training_confusion_matrix = trained_classifier.confusionMatrix();

print('Training confusion matrix:', training_confusion_matrix);
print('Training accuracy:', training_confusion_matrix.accuracy());


// STEP 13: validate the model
var classified_validation = validationSample.classify(trained_classifier);

print('Validation classified:');
print(classified_validation);


// STEP 14: inspect validation confusion matrix
var validation_confusion_matrix = classified_validation.errorMatrix('LC', 'classification');

print('Validation confusion matrix:', validation_confusion_matrix);
print('Validation accuracy:', validation_confusion_matrix.accuracy());


// STEP 15: apply the classifier to our input image
var classified_median_SR_S2_image = median_SR_S2_image.classify(trained_classifier);
// Visualize classification predictions
Map.addLayer(classified_median_SR_S2_image, {min:0, max:10, palette: LC_palette}, 'classified_median_SR_S2_image 2024');

// Checking performances 
// PROBLEM: the method errorMatrix() defined for ee.ImageCollection objects, so
// it doesn't work directly on classified_median_SR_S2_image as this is a simple Image.
// So, to estimate the accuracy obtained on the median image, we need to take some samples
// and their labels from ESA_LC_image and make our observations.

// Sample ESA WorldCover dataset within the borders of our ROI
var referenceSample = ESA_LC_image.sample({
    scale: 10,
    region: geometry,
    geometries: true,
    tileScale: 8,      // increased tileScale to mitigate computation problems
    numPixels: 1000
});

// Sample the classified image at the location of reference samples
var classified_sampled = classified_median_SR_S2_image.sampleRegions({
    scale: 10,
    collection: referenceSample,
    geometries: true,
    tileScale: 8,
    properties: ['LC']
});

// Compute the confusion matrix
var errorMatrix = classified_sampled.errorMatrix('LC', 'classification');

print('Confusion Matrix:', errorMatrix);
print('Accuracy:', errorMatrix.accuracy());