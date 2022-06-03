# Table of Contents
1. [Description](#description)
2. [Options](#options)
3. [Actor Flow](#actor-flow)
4. [Sample Result](#sample-result)



<a name="description"></a>
## Description
An Apify actor that fetches Images from google

<a name="options"></a>
## Options
- url => Start URL that you want
- keyword => Keyword search. Should be longer than 2.
- category => Category search. It should be provided like *weight-management/calorie-burners*
- pages => Pages that you want to scrape. There are two formats of this input which are `1-5` (sequential) and `1,4,6` (manual selection).

<a name="actor-flow"></a>
## Actor Flow
1) Gets input and builds actor mode
2) Fetches products from list
3) Crawl each product detail
4) Pushes data

<a name="sample-result"></a>
## Sample Result
```
```
