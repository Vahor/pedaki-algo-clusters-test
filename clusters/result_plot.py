import json
import os
import sys

import matplotlib.pyplot as plt
import numpy as np


def load_json_data(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data


def show_plot(total_friends_accepted, total_friends_requests, language_counts, specialization_counts, gender_counts,
              title):
    # Prepare the data for plotting
    friends_ratio = total_friends_accepted / total_friends_requests if total_friends_requests > 0 else 0.0
    print(total_friends_accepted, total_friends_requests, friends_ratio)

    languages = list(language_counts.keys())
    languages.sort()
    language_values = list(language_counts.values())

    specializations = list(specialization_counts.keys())
    specializations.sort()
    specialization_values = list(specialization_counts.values())

    genders = list(gender_counts.keys())
    genders.sort()
    gender_values = list(gender_counts.values())

    # Plotting the data
    plt.figure(figsize=(10, 6))

    # Plot for languages
    plt.subplot(2, 2, 1)
    bars = plt.bar(languages, language_values)
    plt.title('Language Preferences')
    plt.xlabel('Languages')
    plt.ylabel('Count')

    # Plot for specializations
    plt.subplot(2, 2, 2)
    bars = plt.bar(specializations, specialization_values)
    plt.title('Specialization Preferences')
    plt.xlabel('Specializations')
    plt.ylabel('Count')

    # Plot for gender
    plt.subplot(2, 2, 3)
    bars = plt.bar(genders, gender_values)
    plt.title(f'Gender Distribution')
    plt.xlabel('Gender')
    plt.ylabel('Count')

    # Plot for friends
    plt.subplot(2, 2, 4)
    plt.bar(['Friends Ratio'], [friends_ratio])
    plt.title('Friends Ratio')
    plt.ylim([0, 1])
    plt.ylabel('Ratio')

    # Add title to the figure
    plt.suptitle(title)

    # Adjust the spacing between subplots
    plt.tight_layout()


folder = "graph-output" if sys.argv[1] == "1" else "kmeans"
adjusted = "_adjusted" if sys.argv[2] == "1" else ""

# Folder path containing the JSON files
folder_path = f'./{folder}{adjusted}'
print(f'Looking in folder: {folder_path}')

all_language_counts = {}
all_specialization_counts = {}
all_gender_counts = {}

all_total_friends_requests = 0
all_total_friends_accepted = 0

all_person_ids = []

# Iterate over all the files in the folder
for file_name in os.listdir(folder_path):
    file_path = os.path.join(folder_path, file_name)

    if file_name.endswith('.json'):

        language_counts = {}
        specialization_counts = {}
        gender_counts = {}

        total_friends_requests = 0
        total_friends_accepted = 0

        data = load_json_data(file_path)
        person_ids = [person['id'] for person in data]
        all_person_ids.extend(person_ids)

        # Iterate over all the people
        for person in data:
            # Count languages
            for language in person['options']['languages']:
                if language in language_counts:
                    language_counts[language] += 1
                else:
                    language_counts[language] = 1

            # Count specializations
            for specialization in person['options']['specialization']:
                if specialization in specialization_counts:
                    specialization_counts[specialization] += 1
                else:
                    specialization_counts[specialization] = 1

            # Count gender
            if person['gender'] in gender_counts:
                gender_counts[person['gender']] += 1
            else:
                gender_counts[person['gender']] = 1

            # Check if friend is a success
            total_friends_accepted += np.in1d(person['friends'], person_ids).sum()
            total_friends_requests += len(person['friends'])

        show_plot(
            total_friends_accepted,
            total_friends_requests,
            language_counts,
            specialization_counts,
            gender_counts,
            f'Cluster {file_name[:-5]} - {len(data)} people'
        )

        # Add to all counts
        all_total_friends_accepted += total_friends_accepted
        all_total_friends_requests += total_friends_requests

        for language in language_counts:
            if language in all_language_counts:
                all_language_counts[language] += language_counts[language]
            else:
                all_language_counts[language] = language_counts[language]

        for specialization in specialization_counts:
            if specialization in all_specialization_counts:
                all_specialization_counts[specialization] += specialization_counts[specialization]
            else:
                all_specialization_counts[specialization] = specialization_counts[specialization]

        for gender in gender_counts:
            if gender in all_gender_counts:
                all_gender_counts[gender] += gender_counts[gender]
            else:
                all_gender_counts[gender] = gender_counts[gender]

# Show the plot for all clusters
show_plot(
    all_total_friends_accepted,
    all_total_friends_requests,
    all_language_counts,
    all_specialization_counts,
    all_gender_counts,
    f'All Clusters - {len(all_person_ids)} people'
)

plt.show()
