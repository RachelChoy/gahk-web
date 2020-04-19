/**
 * AcroageController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
    //(preview)
    acroage: async function (req, res) {

        if (req.method == 'GET') { return res.view('competition/form/acroage'); }

        req.session.data = req.body.Acroage;

        return res.view('pages/competition/form/acroage_preview', { 'data': req.session.data || {} });
    },


    //action - create
    acroage_preview: async function (req, res) {

        if (req.method == 'POST') {
            //create Acroage
            req.session.data.payStatus = "unpaid";
            req.session.data.formStatus = "ToBeCon";
            req.session.data.teamStatus = "suTeam";
            await Acroage.create(req.session.data);

            //Set idCode to Acroage
            var model = await Acroage.findOne(req.session.data);
            await Acroage.update(model.id).set({
                idCode: "AGO2020-" + model.id
            })
            model["idCode"] = "AGO2020-" + model.id;

            //clear all session data
            req.session.data = {};
            req.session.Acrodata = {};
            var user = await User.update(req.session.userId).set({
                TRGPdata: {}
            }).fetch();
            if (user.length == 0) return res.notFound();

            return res.view('pages/competition/form/confirm_form', { 'form': model });
        }
    },


    save: async function (req, res) {

        if (req.method == "GET") return res.forbidden();

        req.session.Acrodata = req.body;

        var user = await User.update(req.session.userId).set({
            Acrodata: req.body
        }).fetch();

        if (user.length == 0) return res.notFound();

        if (req.wantsJSON) {
            return res.json({ message: "儲存成功 Sucessfully save.", url: '/competition/form/acroage' });    // for ajax request
        } else {
            return res.redirect('/competition/form/acroage');           // for normal request
        }
    },

    //**************************admin/HandleApply*************************
    reject: async function (req, res) {
        if (req.method == "GET") return res.forbidden();

        var models = await Acroage.update(req.params.id).set({ formStatus: "rejected" }).fetch();

        if (models.length == 0) return res.notFound();

        if (req.wantsJSON) {
            return res.json({ message: "申請已被拒絕 Application has been rejected.", url: '/admin/applyHandle/search' });    // for ajax request
        } else {
            return res.redirect('/admin/applyHandle/search');           // for normal request
        }

    },

    // action - confirm all
    confirmAll: async function (req, res) {

        if (req.method == "GET") return res.forbidden();

        var condition = {};

        if (req.session.searchResult.item) condition.item = req.session.searchResult.item;
        if (req.session.searchResult.category) condition.category = req.session.searchResult.category;
        if (req.session.searchResult.payStatus) condition.payStatus = req.session.searchResult.payStatus;
        if (req.session.searchResult.formStatus) condition.formStatus = req.session.searchResult.formStatus;
        if (req.session.searchResult.teamStatus) condition.teamStatus = req.session.searchResult.teamStatus;

        var models = await Acroage.find({
            where: condition
        });

        if (models.length == 0) return res.notFound();

        models.forEach(async function (model) {
            if (model.formStatus == "ToBeCon" || model.formStatus == "dataDef") {
                await Acroage.update(model.id).set({ formStatus: "accepted" })
            }
        });

        if (req.wantsJSON) {
            return res.json({ message: "已確認全部申請表 Sucessfully confirm all applications.", url: '/admin/applyHandle/search' });    // for ajax request
        } else {
            return res.redirect('/admin/applyHandle/search');           // for normal request
        }
    },

    // action - confirm form
    confirm: async function (req, res) {
        if (req.method == "GET") return res.forbidden();

        var models = await Acroage.update(req.params.id).set({ formStatus: "accepted" }).fetch();

        if (models.length == 0) return res.notFound();

        if (req.wantsJSON) {
            return res.json({ message: "申請已被確認 Application has been accepted.", url: '/admin/applyHandle/search' });    // for ajax request
        } else {
            return res.redirect('/admin/applyHandle/search');           // for normal request
        }
    },

    dataDef: async function (req, res) {
        if (req.method == "GET") return res.forbidden();

        var models = await Acroage.update(req.params.id).set({ formStatus: "dataDef" }).fetch();

        if (models.length == 0) return res.notFound();

        if (req.wantsJSON) {
            return res.json({ message: "申請資料不全 Data Deficiency.", url: '/admin/applyHandle/search' });    // for ajax request
        } else {
            return res.redirect('/admin/applyHandle/search');           // for normal request
        }

    },

    waitingList: async function (req, res) {
        if (req.method == "GET") return res.forbidden();

        var models = await Acroage.update(req.params.id).set({ teamStatus: "waitTeam" }).fetch();

        if (models.length == 0) return res.notFound();

        if (req.wantsJSON) {
            return res.json({ message: "申請隊伍/團體已設為後補 Applied Team/Group has been set on waiting list.", url: '/admin/applyHandle/search' });    // for ajax request
        } else {
            return res.redirect('/admin/applyHandle/search');           // for normal request
        }

    },

    export_xlsx: async function (req, res) {
        var condition = {};
        if (req.session.searchResult.item) condition.category = req.session.searchResult.item;
        if (req.session.searchResult.category) condition.category = req.session.searchResult.category;
        if (req.session.searchResult.payStatus) condition.payStatus = req.session.searchResult.payStatus;
        if (req.session.searchResult.formStatus) condition.formStatus = req.session.searchResult.formStatus;
        if (req.session.searchResult.teamStatus) condition.teamStatus = req.session.searchResult.teamStatus;

        var models = await Acroage.find({
            where: condition
        });

        var XLSX = require('xlsx');
        var wb = XLSX.utils.book_new();
        var payStatus, formStatus, teamStatus;
        var ws = XLSX.utils.json_to_sheet(models.map(model => {

            var day1 = model.birthday1.split('-');
            var date1 = day1[2] + "/" + day1[1] + "/" + day1[0];
            var day2 = model.birthday2.split('-');
            var date2 = day2[2] + "/" + day2[1] + "/" + day2[0];
            if (model.item == "女子三人 Women's trio") {
                var day3 = model.birthday3.split('-');
                var date3 = day3[2] + "/" + day3[1] + "/" + day3[0];
            } else {
                var date3 = "";
            }


            var n = new Date(model.createdAt);
            var cmonth = n.getMonth() + 1;
            var applyDate = n.getDate() + "/" + cmonth + "/" + n.getFullYear();

            var m = new Date(model.updatedAt);
            var umonth = m.getMonth() + 1;
            var updateDate = m.getDate() + "/" + umonth + "/" + m.getFullYear() + " " + m.getHours() + ":" + m.getMinutes() + ":" + m.getSeconds();

            if (model.payStatus == "paid") {
                payStatus = "已付款 Paid";
            } else {
                payStatus = "未付款 Unpaid";
            }

            if (model.formStatus == "ToBeCon") {
                formStatus = "待處理 To be handled";
            } else if (model.formStatus == "accepted") {
                formStatus = "已確認 Accepted";
            } else if (model.formStatus == "rejected") {
                formStatus = "已拒絕 Rejected";
            } else if (model.formStatus == "dataDef") {
                formStatus = "資料不全 Data Deficiency";
            }

            if (model.teamStatus == "suTeam") {
                teamStatus = "正選 Successful Team";
            } else {
                teamStatus = "後補 Team on Waitiing List";
            }

            return {
                "申請表編號 Application Number": model.idCode,
                "組別/年齡 Category/Age": model.category,
                "項目 Item": model.item,
                "參加者(1)是否有中文姓名 Applicant(1) Any Chinese name": model.havecname1,
                "參加者(1)中文姓名 Applicant(1) Name in Chinese": model.cpChiName1,
                "參加者(1)英文姓名 Applicant(1) Name in English": model.cpEngName1,
                "參加者(1)性別 Applicant(1) Gender": model.gender1,
                "參加者(1)出生日期  Applicant(1) Date of Birth": date1,
                "參加者(1)身分證號碼  Applicant(1) ID Card Number": model.idNo1,
                "參加者(1)聯絡電話 Applicant(1) Contact No.": model.contactNo1,
                "參加者(1)電郵 Applicant(1) Email Address": model.email1,
                "參加者(1)聯絡地址 Applicant(1) Contact Address": model.address1,
                "參加者(2)是否有中文姓名 Applicant(2) Any Chinese name": model.havecname2,
                "參加者(2)中文姓名 Applicant(2) Name in Chinese": model.cpChiName2,
                "參加者(2)英文姓名 Applicant(2) Name in English": model.cpEngName2,
                "參加者(2)性別 Applicant(2) Gender": model.gender2,
                "參加者(2)出生日期  Applicant(2) Date of Birth": date2,
                "參加者(2)身分證號碼  Applicant(2) ID Card Number": model.idNo2,
                "參加者(2)聯絡電話 Applicant(2) Contact No.": model.contactNo2,
                "參加者(2)電郵 Applicant(2) Email Address": model.email2,
                "參加者(2)聯絡地址 Applicant(2) Contact Address": model.address2,
                "參加者(3)是否有中文姓名 Applicant(3) Any Chinese name": model.havecname3,
                "參加者(3)中文姓名 Applicant(3) Name in Chinese": model.cpChiName3,
                "參加者(3)英文姓名 Applicant(3) Name in English": model.cpEngName3,
                "參加者(3)性別 Applicant(3) Gender": model.gender3,
                "參加者(3)出生日期  Applicant(3) Date of Birth": date3,
                "參加者(3)身分證號碼  Applicant(3) ID Card Number": model.idNo3,
                "參加者(3)聯絡電話 Applicant(3) Contact No.": model.contactNo3,
                "參加者(3)電郵 Applicant(3) Email Address": model.email3,
                "參加者(3)聯絡地址 Applicant(3) Contact Address": model.address3,
                "教練姓名 Coach Name": model.coachName,
                "教練聯絡電話 Coach Contact Number": model.cContactNo,
                "學校/機構名稱(如適用) School/Organization Name(If applicable)": model.organName,
                "收據枱頭 Receipt header": model.receiptHeader,
                "學校/機構名稱 School/Institution Name": model.receiptName,
                "參加者(1)家長姓名 Applicant(1)'s Parent Name": model.parentName1,
                "參加者(2)家長姓名 Applicant(2)'s Parent Name": model.parentName2,
                "參加者(3)家長姓名 Applicant(3)'s Parent Name": model.parentName3,
                "付款狀況 Payment Status": payStatus,
                "申請狀況 Apply Status": formStatus,
                "隊伍/團體狀況 Team Status": teamStatus,
                "提交日期 Apply Date": applyDate,
                "上次更新 Last upadated": updateDate,
            }
        }));
        XLSX.utils.book_append_sheet(wb, ws, "acroage");
        res.set("Content-disposition", "attachment; filename=acroage.xlsx");
        return res.end(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    },


};