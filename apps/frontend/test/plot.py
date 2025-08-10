import matplotlib.pyplot as plot
import pandas as pd

dataFrame = pd.read_csv("./test/output/output.csv")

dataFrame.plot.scatter(x="seedLength", y="result")
    

plot.show()