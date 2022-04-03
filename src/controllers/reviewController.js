const reviewModel = require('../models/reviewModel')
const bookModel = require('../models/bookModel')
const mongoose = require("mongoose")

const isValid = function (value) {
    if (typeof value == 'undefined' || value === null) return false
    if (typeof value == 'string' && value.trim().length === 0) return false
    return true
}

const isValidObjectId = function(objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}

const isValidRequestBody = function(requestBody) {
    return Object.keys(requestBody).length > 0; // it checks, is there any key is available or not in request body
};

//................................post_api_create_review......................................\\

//Adding review for a specific book.
const createReview = async function (req, res) {
    try {
        const params = req.params.bookId //accessing bookId from params.
        requestReviewBody = req.body
        const { reviewedBy, rating, review } = requestReviewBody;

        //validation starts.
        if (!isValidObjectId(params)) {
            return res.status(400).send({ status: false, message: "Invalid bookId." })
        }

        //for empty request body.
        if (!isValidRequestBody(requestReviewBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide review details to update.' })
        }
        if (!isNaN(reviewedBy)) {
            return res.status(400).send({ status: false, message: "Reviewer's name cannot be a number." })
        }

        if (!isValid(reviewedBy)) {
            return res.status(400).send({ status: false, message: "Reviewer's name is required" })
        }
        if (!isValid(rating)) {
            return res.status(400).send({ status: false, message: "Rating is required" })
        }
        if (!isValid(rating)) {
            return res.status(400).send({ status: false, message: "Rating must be 1,2,3,4 or 5." })
        }
    
        //setting rating limit between 1-5.
        if (!(rating >= 1 && rating <= 5)) {
            return res.status(400).send({ status: false, message: "Rating must be in between 1 to 5." })
        }
        const searchBook = await bookModel.findById({ _id: params})

        if (!searchBook) {
            return res.status(404).send({ status: false, message: `Book does not exist by this ${params}.` })
        }

        //verifying the book is deleted or not so that we can add a review to it.
        if (searchBook.isDeleted == true) {
            return res.status(400).send({ status: false, message: "Cannot add review, Book has been already deleted." })
        }
        requestReviewBody.bookId = searchBook._id;
        requestReviewBody.reviewedAt = new Date();

        const saveReview = await reviewModel.create(requestReviewBody)
        if (saveReview) {
            await bookModel.findOneAndUpdate({ _id: params }, { $inc: { reviews: 1 } })
        }
        const response = await reviewModel.findOne({ _id: saveReview._id }).select({__v: 0, createdAt: 0, updatedAt: 0, isDeleted: 0 })
        return res.status(201).send({ status: true, message: `Review added successfully for ${searchBook.title}`, data: response })
    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}

//................................put_api_update_review......................................\\

const updateReview = async function (req, res) {
    try {
        const bookParams = req.params.bookId;
        const reviewParams = req.params.reviewId
        const requestUpdateBody = req.body
        const { review, rating, reviewedBy } = requestUpdateBody;

        //validation starts.
        if (!isValidObjectId(bookParams)) {
            return res.status(400).send({ status: false, message: "Invalid bookId." })
        }
        if (!isValidObjectId(reviewParams)) {
            return res.status(400).send({ status: false, message: "Invalid reviewId." })
        }
        if (!isValidRequestBody(requestUpdateBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide review details to update.' })
        } //validation ends

        //setting combinations
        if (review || rating || reviewedBy) {

            if (!isValid(review)) {
                return res.status(400).send({ status: false, message: "Review is missing ! Please provide the review details to update." })
            }
            if (!isValid(reviewedBy)) {
                return res.status(400).send({ status: false, message: "Reviewer's name is missing ! Please provide the name to update." })
            };
        }

        //finding book and review on which we have to update.
        const searchBook = await bookModel.findById({ _id: bookParams }).select({ createdAt: 0, updatedAt: 0, __v: 0 })
        if (!searchBook) {
            return res.status(404).send({ status: false, message: `Book does not exist by this ${bookParams}. ` })
        }
        const searchReview = await reviewModel.findById({ _id: reviewParams })
        if (!searchReview) {
            return res.status(404).send({status: false,message: `Review does not exist by this ${reviewParams}.`})
        }

        //checking whether the rating is number or character.
        if (typeof (rating) === 'number') {
            if (req.body.rating === 0) {
                return res.status(400).send({ status: false, message: "Rating cannot be 0. Please provide rating between 1 to 5." })
            }
            if (!isValid(rating)) {
                return res.status(400).send({ status: false, message: "Rating must be 1,2,3,4 or 5." })
            }
            if (!(rating > 0 && rating < 6)) {
                return res.status(400).send({ status: false, message: "Rating must be in between 1 to 5." })
            }
        }

        //verifying the attribute isDeleted:false or not for both books and reviews documents.
        if (searchBook.isDeleted == false) {
            if (searchReview.isDeleted == false) {
                const updateReviewDetails = await reviewModel.findOneAndUpdate({ _id: reviewParams }, { review: review, rating: rating, reviewedBy: reviewedBy }, { new: true })

                let destructureForResponse = searchBook.toObject();
                destructureForResponse['updatedReview'] = updateReviewDetails;

                return res.status(200).send({ status: true, message: "Successfully updated the review of the book.", data: destructureForResponse })

            } else {
                return res.status(400).send({ status: false, message: "Unable to update details.Review has been already deleted" })
            }
        } else {
            return res.status(400).send({ status: false, message: "Unable to update details.Book has been already deleted" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}

//................................delete_api_delete_book_review......................................\\

const deleteReview = async function (req, res) {
    try {
        const bookParams = req.params.bookId;
        const reviewParams = req.params.reviewId

        //validation starts.
        if (!isValidObjectId(bookParams)) {
            return res.status(400).send({ status: false, message: "Invalid bookId." })
        }
        if (!isValidObjectId(reviewParams)) {
            return res.status(400).send({ status: false, message: "Invalid reviewId." })
        }
        //validation ends.

        //finding book and checking whether it is deleted or not.
        const searchBook = await bookModel.findById({ _id: bookParams, isDeleted: false })
        if (!searchBook) {
            return res.status(400).send({ status: false, message: `Book does not exist by this ${bookParams}.` })
        }

        //finding review and checking whether it is deleted or not.
        const searchReview = await reviewModel.findById({ _id: reviewParams })
        if (!searchReview) {
            return res.status(400).send({ status: false, message: `Review does not exist by this ${reviewParams}.` })
        }

        //verifying the attribute isDeleted:false or not for both books and reviews documents.
        if (searchBook.isDeleted == false) {
            if (searchReview.isDeleted == false) {
                const deleteReviewDetails = await reviewModel.findOneAndUpdate({ _id: reviewParams }, { isDeleted: true, deletedAt: new Date() }, { new: true })

                if (deleteReviewDetails) {
                    await bookModel.findOneAndUpdate({ _id: bookParams },{$inc:{ reviews: -1 }})
                }
                return res.status(200).send({ status: true, message: "Review deleted successfully.", data:deleteReviewDetails})

            } else {
                return res.status(400).send({ status: false, message: "Unable to delete review details.Review has been already deleted" })
            }
        } else {
            return res.status(400).send({ status: false, message: "Unable to delete .Book has been already deleted" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}

module.exports = {createReview, updateReview, deleteReview}