# Crowded Orbit

**COM-480 Data Visualization Project, EPFL 2025**

Who is filling Earth's orbit, and how is space becoming an increasingly crowded infrastructure?

| Student's name    | SCIPER |
| ----------------- | ------ |
| Kevin Abou Jaoude | 358300 |
| Youssef Dib       | 339964 |
| Mark Nabbout      | 358312 |

## Project Structure

```
├── data/                   Raw dataset (UCS Satellite Database)
├── eda.ipynb               Exploratory data analysis notebook
├── img/                    EDA plots and wireframe sketches
├── milestones/             Milestone documents
│   ├── milestone1/
│   └── milestone2/
└── website/                Functional prototype (HTML/CSS/D3.js)
    ├── css/
    ├── js/
    └── data/               Preprocessed JSON for the website
```

## Milestones

**Milestone 1** (March 20): Dataset, problematic, EDA, related work
You can find the full document [here](milestones/milestone1/milestone1.md).

**Milestone 2** (April 17): Visualization sketches, tools, prototype
You can find the full document [here](milestones/milestone2/milestone2.md).

**Milestone 3** (May 29): Final deliverables
*Coming soon.*

## Running the Prototype

```bash
cd website
python -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080).

## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone
