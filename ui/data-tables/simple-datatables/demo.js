async function load() {
    let myData = {
        "headings": [
            "Name",
            "Company",
            "Ext.",
            "Start Date",
            "Email",
            "Phone No."
        ],
        "data": [
            [
                "Hedwig F. Nguyen",
                "Arcu Vel Foundation",
                "9875",
                "03/27/2017",
                "nunc.ullamcorper@metusvitae.com",
                "070 8206 9605"
            ]
        ]
    };

    // Initial data.
    let dataTable = new simpleDatatables.DataTable("#demoTable", {
        data: myData
    });

    // Wait for visual effect.
    await new Promise(r => window.setTimeout(r, 2000));

    // Add data.
    let newRow = [
        "Genevieve U. Watts",
        "Eget Incorporated",
        "9557",
        "07/18/2017",
        "Nullam.vitae@egestas.edu",
        "0800 106980"
    ];
    dataTable.rows.add(newRow);
}

load();
