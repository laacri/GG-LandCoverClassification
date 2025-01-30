# GG-LandCoverClassification

This repository contains the exercises developed for the course of Geomatics and Geoinformation. It currently includes:
- **EXERCISE 6 - Machine Learning with Google Earth Engine** <br>
  In this exercise I classify by Land Cover type at pixel-level the aggregated image of a selected geographical area (namely, the Bosphorus Strait) over a given time interval (namely, 1<sup>st</sup> Jan. 2021 to 1<sup>st</sup> Jan. 2024). The exercise was developed in Google Earth Engine (GEE) Editor IDE and the data source is the Sentinel 2 Surface Reflectance image collection provided by the GEE Data Catalog. The supervised learning algorithm chosen to carry out this exercise is Random Forest, which achieves a test accuracy of $76.1\\%$. <br>
  The classification results are shown below. 

  Ground truth:

  <div align="center">
    <img src='https://raw.githubusercontent.com/laacri/GG-LandCoverClassification/refs/heads/main/ESA_true_labels.png' width=700/>
  </div>

  Random Forest classification:

  <div align="center">
    <img src='https://raw.githubusercontent.com/laacri/GG-LandCoverClassification/refs/heads/main/random_forest_classification.png' width=700/>
  </div>

<!---
EXERCISES TO ADD IN THE FUTURE:
- EXERCISE 1 - Reference frame transformations and coordinate system conversions (maybe not)
- EXERCISE 2 - Absolute positioning and troposphere remote sensing (maybe not)
- EXERCISE 3 - Handling spectral indices
- EXERCISE 4 - 3D reconstruction with Agisoft Metashape: satellite imagery (Remote Sensing and Geo Big Data)
- EXERCISE 5 - Flood mapping with SAR (Remote Sensing and Geo Big Data)
---> 
