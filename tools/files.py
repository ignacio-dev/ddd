import os

first = os.listdir()

for file in os.listdir():
	os.rename(file, file.lower())

then = os.listdir()

print('Done, all files renamed')